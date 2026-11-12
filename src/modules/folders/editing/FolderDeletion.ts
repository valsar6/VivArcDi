import type { BookmarkNode } from '../../../core/browser/bookmarks/BookmarkNode.js';
import type { BookmarkWriter } from '../../../core/browser/bookmarks/BookmarkWriter.js';
import type { BookmarkTrash } from './BookmarkTrash.js';
import type { BrowserTabs } from '../../../core/browser/BrowserTabs.js';
import type { Logger } from '../../../core/support/Logger.js';
import { TabData } from '../../../core/tabs/TabData.js';
import type { ToastKind } from '../../../core/dom/Toast.js';
import type { ClosingLinks } from './ClosingLinks.js';
import type { OpenFolders } from '../tree/OpenFolders.js';

export interface FolderDeletionDependencies {
  writer: Pick<BookmarkWriter, 'subTree' | 'move'>;
  trash: Pick<BookmarkTrash, 'id'>;
  tabs: Pick<BrowserTabs, 'query' | 'remove'>;
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
      linkIds = FolderDeletion.#linkIds(folder);
      const tabIds = await this.#tabsOf(linkIds);
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

  async #tabsOf(linkIds: string[]): Promise<number[]> {
    const wanted = new Set(linkIds);
    return (await this.#deps.tabs.query({})).flatMap((tab) => {
      const { bookmarkId } = TabData.ownOf(tab);
      return tab.id !== undefined && bookmarkId !== undefined && wanted.has(bookmarkId) ? [tab.id] : [];
    });
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

  static #linkIds(node: BookmarkNode): string[] {
    const own = node.url !== undefined ? [node.id] : [];
    return [...own, ...(node.children ?? []).flatMap((child) => FolderDeletion.#linkIds(child))];
  }
}
