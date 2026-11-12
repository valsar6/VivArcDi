import type { BookmarkCopier } from '../../core/bookmarks/BookmarkCopier.js';
import type { BookmarkWriter } from '../../core/bookmarks/BookmarkWriter.js';
import type { Logger } from '../../core/Logger.js';
import type { ToastKind } from '../../core/Toast.js';

export interface FolderDuplicationDependencies {
  writer: Pick<BookmarkWriter, 'get'>;
  copier: Pick<BookmarkCopier, 'copy'>;
  /** Shows a short message to the user. */
  notify: (text: string, kind?: ToastKind) => void;
  logger: Logger;
}

export class FolderDuplication {
  #deps: FolderDuplicationDependencies;

  /**
   * Duplicates a bookmark folder right below itself, with the same name and the same subfolders
   * and links. The copy is closed and has no tabs. When the copy fails, the original stays as it
   * was and the user is told.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: FolderDuplicationDependencies) {
    this.#deps = dependencies;
  }

  /**
   * @param folderId The bookmark id of the folder to duplicate.
   */
  public async duplicate(folderId: string): Promise<void> {
    let name = folderId;
    try {
      const folder = await this.#deps.writer.get(folderId);
      name = folder.title;
      if (folder.parentId === undefined) {
        throw new Error('the folder has no parent');
      }
      const copies = await this.#deps.copier.copy([folderId], folder.parentId, folder.index === undefined ? undefined : folder.index + 1);
      if (copies.length === 0) {
        throw new Error('nothing was copied');
      }
    } catch (error) {
      this.#deps.logger.warn('could not duplicate the folder', error);
      this.#deps.notify(`Could not duplicate "${name}"`, 'error');
    }
  }
}
