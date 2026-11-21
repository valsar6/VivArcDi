import type { BookmarkCopier } from './BookmarkCopier.js';
import type { BookmarkWriter } from '../../../core/browser/bookmarks/BookmarkWriter.js';
import type { LinkExtras } from './LinkExtras.js';
import type { Logger } from '../../../core/support/Logger.js';
import type { ToastKind } from '../../../core/dom/Toast.js';

export interface LinkDuplicationDependencies {
  writer: Pick<BookmarkWriter, 'get'>;
  copier: Pick<BookmarkCopier, 'copy'>;
  extras: Pick<LinkExtras, 'copy'>;
  /** Shows a short message to the user. */
  notify: (text: string, kind?: ToastKind) => void;
  logger: Logger;
}

export class LinkDuplication {
  #deps: LinkDuplicationDependencies;

  /**
   * Duplicates a saved link right below itself, with the same title and address. The copy has no
   * tab. When the copy fails, the original stays as it was and the user is told.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: LinkDuplicationDependencies) {
    this.#deps = dependencies;
  }

  /**
   * @param linkId The bookmark id of the link to duplicate.
   */
  public async duplicate(linkId: string): Promise<void> {
    let title = linkId;
    try {
      const link = await this.#deps.writer.get(linkId);
      title = link.title;
      if (link.parentId === undefined) {
        throw new Error('the link has no parent');
      }
      const [copyId] = await this.#deps.copier.copy([linkId], link.parentId, link.index === undefined ? undefined : link.index + 1);
      if (copyId === undefined) {
        throw new Error('nothing was copied');
      }
      await this.#deps.extras.copy(linkId, copyId);
    } catch (error) {
      this.#deps.logger.warn('could not duplicate the link', error);
      this.#deps.notify(`Could not duplicate "${title}"`, 'error');
    }
  }
}
