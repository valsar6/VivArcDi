import type { BookmarkWriter } from '../../../core/bookmarks/BookmarkWriter.js';
import type { BookmarkTrash } from '../../../core/bookmarks/BookmarkTrash.js';
import type { BrowserTabs } from '../../../core/BrowserTabs.js';
import type { Logger } from '../../../core/Logger.js';
import type { ToastKind } from '../../../core/Toast.js';
import type { ClosingLinks } from './ClosingLinks.js';
import type { FolderLinkTabs } from './FolderLinkTabs.js';
import type { OpenFolders } from '../tree/OpenFolders.js';

export interface FolderDeletionDependencies {
  writer: Pick<BookmarkWriter, 'subTree' | 'move'>;
  trash: Pick<BookmarkTrash, 'id'>;
  tabs: Pick<BrowserTabs, 'remove'>;
  linkTabs: Pick<FolderLinkTabs, 'linkIds' | 'tabsOf'>;
  openFolders: Pick<OpenFolders, 'forget'>;
  closing: Pick<ClosingLinks, 'add' | 'clear'>;
  /** Draws the section again from the bookmarks. */
  redraw: () => void;
  /** Shows a short message to the user. */
  notify: (text: string, kind?: ToastKind) => void;
  logger: Logger;
}

export class FolderDeletion {
  #deps: FolderDeletionDependencies;

  /**
   * Deletes a bookmark folder the way Arc does, but recoverably: the folder moves into Vivaldi's
   * bookmark Trash with everything in it, and only then the tabs of its links close. If the Trash
   * is missing or the move fails, nothing is closed, the user is told, and the folder is never
   * erased instead.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: FolderDeletionDependencies) {
    this.#deps = dependencies;
  }

  /**
   * @param folderId The bookmark id of the folder to delete.
   */
  public async delete(folderId: string): Promise<void> {
    const { closing, notify } = this.#deps;
    let name = folderId;
    let linkIds: string[] = [];
    try {
      const folder = await this.#deps.writer.subTree(folderId);
      name = folder.title;
      linkIds = this.#deps.linkTabs.linkIds(folder);
      const tabIds = await this.#deps.linkTabs.tabsOf(linkIds);
      closing.add(linkIds);
      await this.#moveToTrash(folderId);
      this.#deps.openFolders.forget(folderId);
      await this.#close(tabIds);
      notify(`Folder "${name}" moved to Trash`);
    } catch (error) {
      this.#deps.logger.warn('could not delete the folder', error);
      this.#deps.redraw();
      notify(`Could not delete "${name}"`, 'error');
    } finally {
      closing.clear(linkIds);
    }
  }

  async #moveToTrash(folderId: string): Promise<void> {
    const trashId = await this.#deps.trash.id();
    if (trashId === null) {
      throw new Error('the bookmark Trash was not found');
    }
    await this.#deps.writer.move(folderId, { parentId: trashId });
  }

  async #close(tabIds: number[]): Promise<void> {
    for (const tabId of tabIds) {
      try {
        await this.#deps.tabs.remove(tabId);
      } catch (error) {
        this.#deps.logger.warn('could not close a tab of the deleted folder', error);
      }
    }
  }
}
