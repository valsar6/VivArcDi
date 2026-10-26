type VivaldiTab = chrome.tabs.Tab & { vivExtData?: string };

export class Workspace {
  /**
   * Reads the workspace a tab belongs to from Vivaldi's `vivExtData`.
   *
   * @param tab A tab.
   * @returns The workspace id, or null for a tab outside any workspace.
   */
  public static of(tab: chrome.tabs.Tab): string | null {
    const id = Workspace.#parse((tab as VivaldiTab).vivExtData)['workspaceId'];
    return typeof id === 'number' || typeof id === 'string' ? String(id) : null;
  }

  /**
   * A tab outside any workspace, like a Favorite pinned in every workspace, is shared by all.
   *
   * @param candidate The tab that may be reused.
   * @param newTab The tab the user just opened.
   * @returns Whether the candidate is visible in the new tab's workspace.
   */
  public static shares(candidate: chrome.tabs.Tab, newTab: chrome.tabs.Tab): boolean {
    const workspace = Workspace.of(candidate);
    return workspace === null || workspace === Workspace.of(newTab);
  }

  static #parse(data: string | undefined): Record<string, unknown> {
    try {
      const parsed: unknown = JSON.parse(data ?? '{}');
      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
}
