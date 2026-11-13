import type { BrowserBookmarks } from '../../../core/browser/bookmarks/BrowserBookmarks.js';
import { suggestionOf } from './Suggestion.js';
import type { Suggestion } from './Suggestion.js';
import type { SuggestionSource } from './SuggestionSource.js';

export class BookmarkSuggestions implements SuggestionSource {
  public readonly name = 'bookmarks';
  #bookmarks: Pick<BrowserBookmarks, 'search'>;

  /**
   * The bookmarks that match the typed text, found with `chrome.bookmarks.search`.
   *
   * @param bookmarks The read-only bookmarks API.
   */
  constructor(bookmarks: Pick<BrowserBookmarks, 'search'>) {
    this.#bookmarks = bookmarks;
  }

  /**
   * @param text What the user typed; nothing is suggested for an empty field.
   * @param limit The most suggestions to return.
   * @returns The matching bookmarks; folders are left out.
   */
  public async suggest(text: string, limit: number): Promise<Suggestion[]> {
    if (text.trim() === '') {
      return [];
    }
    const nodes = await this.#bookmarks.search(text.trim());
    return nodes.flatMap((node) => (node.url === undefined ? [] : (suggestionOf('bookmark', node.url, node.title) ?? []))).slice(0, limit);
  }
}
