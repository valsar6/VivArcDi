import type { BookmarkWriter } from '../../core/browser/bookmarks/BookmarkWriter.js';
import type { Logger } from '../../core/support/Logger.js';
import type { TextCopier } from '../clipboard/TextCopier.js';
import type { ToastKind } from '../../core/dom/Toast.js';
import { COPIED_TEXT, FAILED_TEXT } from './LinkTexts.js';

export interface LinkClipboardDependencies {
  writer: Pick<BookmarkWriter, 'get'>;
  copier: Pick<TextCopier, 'write'>;
  /** Shows a short message to the user. */
  notify: (text: string, kind?: ToastKind) => void;
  logger: Logger;
}

export class LinkClipboard {
  #deps: LinkClipboardDependencies;

  /**
   * Copies the saved address of a link row, not the address of its tab, and tells the user.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: LinkClipboardDependencies) {
    this.#deps = dependencies;
  }

  /**
   * @param linkId The bookmark id of the link row.
   */
  public async copy(linkId: string): Promise<void> {
    try {
      const { url } = await this.#deps.writer.get(linkId);
      if (url === undefined) {
        throw new Error('the bookmark has no address');
      }
      await this.#deps.copier.write(url);
      this.#deps.notify(COPIED_TEXT);
    } catch (error) {
      this.#deps.logger.warn('could not copy the link', error);
      this.#deps.notify(FAILED_TEXT, 'error');
    }
  }
}
