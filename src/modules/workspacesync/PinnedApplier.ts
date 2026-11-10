import type { BrowserTabs } from '../../core/BrowserTabs.js';
import type { WorkspaceNames } from '../../core/WorkspaceNames.js';
import type { WorkspaceTabs } from '../../core/WorkspaceTabs.js';
import { LocalPinned } from './LocalPinned.js';
import type { LocalPinnedTab } from './LocalPinned.js';
import type { PinnedEntry } from './SyncStore.js';

export type ApplierTabs = Pick<BrowserTabs, 'move' | 'remove' | 'update'>;

export class PinnedApplier {
  #tabs: ApplierTabs;
  #opener: Pick<WorkspaceTabs, 'openPinned'>;
  #local: Pick<LocalPinned, 'read'>;
  #names: Pick<WorkspaceNames, 'idOf'>;

  /**
   * Brings the pinned tabs of a workspace to a list: opens the missing ones unloaded, closes the
   * ones that were removed elsewhere, and puts them in the order of the list. A removed tab that is
   * active or away from its own page is unpinned and kept, so nothing the user reads disappears.
   *
   * @param tabs Tabs API.
   * @param opener Opens a pinned tab in a workspace.
   * @param local Reads the pinned tabs of a window.
   * @param names The names of the workspaces.
   */
  constructor(tabs: ApplierTabs, opener: Pick<WorkspaceTabs, 'openPinned'>, local: Pick<LocalPinned, 'read'>, names: Pick<WorkspaceNames, 'idOf'>) {
    this.#tabs = tabs;
    this.#opener = opener;
    this.#local = local;
    this.#names = names;
  }

  /**
   * @param windowId The window that holds the tabs.
   * @param workspaceName The workspace name, or null for the area outside any workspace.
   * @param target The pinned tabs the workspace should have, in order.
   * @param current The pinned tabs the workspace has now.
   */
  public async apply(windowId: number, workspaceName: string | null, target: PinnedEntry[], current: LocalPinnedTab[]): Promise<void> {
    const wanted = new Set(target.map(({ key }) => key));
    for (const tab of current.filter(({ entry }) => !wanted.has(entry.key))) {
      await this.#release(tab);
    }
    await this.#open(windowId, workspaceName, target, new Set(current.map(({ entry }) => entry.key)));
    await this.#reorder(windowId, workspaceName, target);
  }

  async #release(tab: LocalPinnedTab): Promise<void> {
    if (tab.active || tab.away) {
      await this.#tabs.update(tab.tabId, { pinned: false });
    } else {
      await this.#tabs.remove(tab.tabId);
    }
  }

  async #open(windowId: number, workspaceName: string | null, target: PinnedEntry[], present: Set<string>): Promise<void> {
    const workspace = workspaceName === null ? null : this.#names.idOf(workspaceName);
    if (workspaceName !== null && workspace === null) {
      return;
    }
    for (const { key, url } of target) {
      if (!present.has(key)) {
        await this.#opener.openPinned(url, workspace, { pinnedUrl: url }, windowId);
      }
    }
  }

  async #reorder(windowId: number, workspaceName: string | null, target: PinnedEntry[]): Promise<void> {
    let budget = target.length;
    while (budget > 0 && (await this.#moveMisplaced(windowId, workspaceName, target))) {
      budget -= 1;
    }
  }

  async #moveMisplaced(windowId: number, workspaceName: string | null, target: PinnedEntry[]): Promise<boolean> {
    const ours = LocalPinned.distinct((await this.#local.read(windowId)).get(workspaceName) ?? []);
    const wanted = target.flatMap(({ key }) => ours.filter(({ entry }) => entry.key === key));
    const wrong = ours.findIndex((tab, position) => tab.tabId !== wanted[position]?.tabId);
    const moving = wanted[wrong];
    const place = ours[wrong];
    if (moving === undefined || place === undefined) {
      return false;
    }
    await this.#tabs.move(moving.tabId, { windowId, index: place.index });
    return true;
  }
}
