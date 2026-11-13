import type { BookmarkWriter } from '../../../core/browser/bookmarks/BookmarkWriter.js';
import type { SubmenuItem } from '../../../core/dom/ContextMenu.js';
import type { Logger } from '../../../core/support/Logger.js';
import { TabData } from '../../../core/tabs/TabData.js';
import type { TabDataWriter } from '../../../core/tabs/TabDataWriter.js';
import type { ToastKind } from '../../../core/dom/Toast.js';
import type { ActiveWorkspace } from '../../../core/workspaces/ActiveWorkspace.js';
import type { WorkspaceListing, WorkspaceNames } from '../../../core/workspaces/WorkspaceNames.js';
import type { ClosingLinks } from './ClosingLinks.js';
import type { FolderLinkTabs } from './FolderLinkTabs.js';
import type { OpenFolders } from '../tree/OpenFolders.js';
import type { WorkspaceRoots } from '../tree/WorkspaceRoots.js';

export const MOVE_TO_LABEL = 'Move to';

export interface FolderRelocationDependencies {
  writer: Pick<BookmarkWriter, 'subTree' | 'move' | 'ensurePath'>;
  linkTabs: Pick<FolderLinkTabs, 'linkIds' | 'tabsOf'>;
  tabData: Pick<TabDataWriter, 'write'>;
  names: Pick<WorkspaceNames, 'entries'>;
  active: Pick<ActiveWorkspace, 'current'>;
  roots: Pick<WorkspaceRoots, 'rootFor'>;
  openFolders: Pick<OpenFolders, 'forget'>;
  closing: Pick<ClosingLinks, 'add' | 'clear'>;
  /** Shows a short message to the user. */
  notify: (text: string, kind?: ToastKind) => void;
  logger: Logger;
}

export class FolderRelocation {
  #deps: FolderRelocationDependencies;

  /**
   * Moves a bookmark folder to another workspace: the folder goes to the end of that workspace's
   * root, and only after that the open tabs of its links get the workspace, so they show under the
   * folder there. When the bookmark cannot move, nothing changes and the user is told.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: FolderRelocationDependencies) {
    this.#deps = dependencies;
  }

  /**
   * @param folderId The bookmark id of the folder.
   * @returns The `Move to` item with one command per workspace, the current one checked; null when Vivaldi lists no workspace.
   */
  public submenu(folderId: string): SubmenuItem | null {
    const { names, active } = this.#deps;
    const entries = names.entries;
    if (entries.length === 0) {
      return null;
    }
    return {
      label: MOVE_TO_LABEL,
      items: entries.map((entry) => {
        const checked = entry.id === active.current;
        return { label: entry.name, checked, run: (): void => (checked ? undefined : void this.move(folderId, entry)) };
      }),
    };
  }

  /**
   * @param folderId The bookmark id of the folder.
   * @param workspace The workspace that receives it.
   */
  public async move(folderId: string, workspace: WorkspaceListing): Promise<void> {
    const { closing, notify, writer, linkTabs } = this.#deps;
    let name = folderId;
    let linkIds: string[] = [];
    try {
      const folder = await writer.subTree(folderId);
      name = folder.title;
      const targetRootId = await writer.ensurePath(this.#deps.roots.rootFor(workspace.name));
      if (targetRootId === (await this.#currentRootId())) {
        notify(`"${name}" is already there`);
        return;
      }
      linkIds = linkTabs.linkIds(folder);
      const tabIds = await linkTabs.tabsOf(linkIds);
      closing.add(linkIds);
      await writer.move(folderId, { parentId: targetRootId });
      this.#deps.openFolders.forget(folderId);
      await this.#send(tabIds, workspace.id);
      notify(`Moved "${name}" to ${workspace.name}`);
    } catch (error) {
      this.#deps.logger.warn('could not move the folder', error);
      notify(`Could not move "${name}"`, 'error');
    } finally {
      closing.clear(linkIds);
    }
  }

  async #currentRootId(): Promise<string | null> {
    const { names, active, roots, writer } = this.#deps;
    const current = names.entries.find((entry) => entry.id === active.current)?.name ?? null;
    const path = roots.rootFor(current);
    return path.length === 0 ? null : writer.ensurePath(path);
  }

  async #send(tabIds: number[], workspaceId: string): Promise<void> {
    for (const tabId of tabIds) {
      try {
        await this.#deps.tabData.write(tabId, (tab) => TabData.withWorkspace(TabData.dataOf(tab), workspaceId));
      } catch (error) {
        this.#deps.logger.warn('could not move a tab of the moved folder', error);
      }
    }
  }
}
