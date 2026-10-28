type VivaldiTab = chrome.tabs.Tab & { vivExtData?: string };

export interface OwnTabData {
  /** Id of the Favorites bookmark the tab is linked to. */
  favoriteId?: string;
  /** Address of the page the pinned tab goes back to on reset. */
  pinnedUrl?: string;
  /** When the tab last stopped being active, in milliseconds since the epoch. */
  lastActive?: number;
}

export type OwnTabChanges = { [Key in keyof OwnTabData]: OwnTabData[Key] | undefined };

const OWN_KEY = 'vivarcdi';
const STACK_KEY = 'group';

export class TabData {
  /**
   * Reads the workspace a tab belongs to from Vivaldi's `vivExtData`.
   *
   * @param tab A tab.
   * @returns The workspace id, or null for a tab outside any workspace.
   */
  public static of(tab: chrome.tabs.Tab): string | null {
    const id = TabData.#parse((tab as VivaldiTab).vivExtData)['workspaceId'];
    return typeof id === 'number' || typeof id === 'string' ? String(id) : null;
  }

  /**
   * Reads the tab stack a tab belongs to from Vivaldi's `vivExtData`. The key is still to be
   * confirmed on Vivaldi 8.2, so it is read here and nowhere else.
   *
   * @param tab A tab.
   * @returns The stack id, or null for a tab outside any stack.
   */
  public static stackOf(tab: chrome.tabs.Tab): string | null {
    const id = TabData.extDataOf(tab)[STACK_KEY];
    return (typeof id === 'string' && id !== '') || typeof id === 'number' ? String(id) : null;
  }

  /**
   * A tab outside any workspace, like a Favorite pinned in every workspace, is shared by all.
   *
   * @param candidate The tab that may be reused.
   * @param newTab The tab the user just opened.
   * @returns Whether the candidate is visible in the new tab's workspace.
   */
  public static shares(candidate: chrome.tabs.Tab, newTab: chrome.tabs.Tab): boolean {
    const workspace = TabData.of(candidate);
    return workspace === null || workspace === TabData.of(newTab);
  }

  /**
   * Adds a workspace to a tab's `vivExtData`, keeping every other field Vivaldi stored there.
   *
   * @param data The current `vivExtData` text, if any.
   * @param workspace The workspace id to write.
   * @returns The new `vivExtData` text.
   */
  public static withWorkspace(data: string | undefined, workspace: string): string {
    return JSON.stringify({ ...TabData.#parse(data), workspaceId: Number.isNaN(Number(workspace)) ? workspace : Number(workspace) });
  }

  /**
   * @param tab A tab.
   * @returns Its `vivExtData` text, if Vivaldi gave one.
   */
  public static dataOf(tab: chrome.tabs.Tab): string | undefined {
    return (tab as VivaldiTab).vivExtData;
  }

  /**
   * @param tab A tab.
   * @returns Its whole `vivExtData`, parsed; empty when missing or malformed.
   */
  public static extDataOf(tab: chrome.tabs.Tab): Record<string, unknown> {
    return TabData.#parse((tab as VivaldiTab).vivExtData);
  }

  /**
   * @param tab A tab.
   * @returns What VivArcDi stored on the tab under its own key.
   */
  public static ownOf(tab: chrome.tabs.Tab): OwnTabData {
    const own = TabData.extDataOf(tab)[OWN_KEY];
    if (typeof own !== 'object' || own === null) {
      return {};
    }
    const { favoriteId, pinnedUrl, lastActive } = own as Record<string, unknown>;
    return {
      ...(typeof favoriteId === 'string' ? { favoriteId } : {}),
      ...(typeof pinnedUrl === 'string' ? { pinnedUrl } : {}),
      ...(typeof lastActive === 'number' && Number.isFinite(lastActive) ? { lastActive } : {}),
    };
  }

  /**
   * Builds a new `vivExtData` that changes only VivArcDi's own key, keeping Vivaldi's keys as they are.
   *
   * @param tab The tab as just read.
   * @param changes Values to set; `undefined` removes a value. The key goes away when it ends up empty.
   * @param extra Other top-level keys to set, such as `workspaceId`.
   * @returns The `vivExtData` text to write.
   */
  public static withOwn(tab: chrome.tabs.Tab, changes: OwnTabChanges, extra: Record<string, unknown> = {}): string {
    const data = TabData.extDataOf(tab);
    delete data[OWN_KEY];
    const own: Record<string, string | number> = { ...TabData.ownOf(tab) };
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined) {
        delete own[key];
      } else {
        own[key] = value;
      }
    }
    return JSON.stringify({ ...data, ...extra, ...(Object.keys(own).length > 0 ? { [OWN_KEY]: own } : {}) });
  }

  /**
   * Builds a new `vivExtData` with one of Vivaldi's own keys set, keeping all the others.
   *
   * @param tab The tab as just read.
   * @param key The key to set, such as `tiling`.
   * @param value Its value.
   * @returns The `vivExtData` text to write.
   */
  public static with(tab: chrome.tabs.Tab, key: string, value: unknown): string {
    return JSON.stringify({ ...TabData.extDataOf(tab), [key]: value });
  }

  static #parse(data: string | undefined): Record<string, unknown> {
    try {
      const parsed: unknown = JSON.parse(data ?? '{}');
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
}
