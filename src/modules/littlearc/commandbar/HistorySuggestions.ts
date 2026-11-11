import type { BrowserHistory } from '../../../core/BrowserHistory.js';
import { suggestionOf } from './Suggestion.js';
import type { Suggestion } from './Suggestion.js';
import type { SuggestionSource } from './SuggestionSource.js';

export class HistorySuggestions implements SuggestionSource {
  public readonly name = 'history';
  #history: Pick<BrowserHistory, 'search'>;

  /**
   * The visited pages: the ones that match the typed text, or, for an empty field, the most recent
   * ones. `chrome.history.search` gives them newest first.
   *
   * @param history The read-only history API.
   */
  constructor(history: Pick<BrowserHistory, 'search'>) {
    this.#history = history;
  }

  /**
   * @param text What the user typed, or nothing for the most recent pages.
   * @param limit The most suggestions to return.
   * @returns The pages, newest first.
   */
  public async suggest(text: string, limit: number): Promise<Suggestion[]> {
    const items = await this.#history.search(text.trim(), limit);
    return items.flatMap((item) => suggestionOf('history', item.url, item.title) ?? []);
  }
}
