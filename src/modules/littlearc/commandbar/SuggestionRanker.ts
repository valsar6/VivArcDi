import { identityOf, isWebAddress } from './AddressIdentity.js';
import { NO_MATCH, fold, scoreOf } from './MatchScore.js';
import type { Suggestion } from './Suggestion.js';

export class SuggestionRanker {
  /**
   * Merges the lists of the sources for typed text. Addresses that are not web addresses are left
   * out, a page appears once (the earlier list wins), and what matches best comes first; equal matches
   * keep the order of the lists.
   *
   * @param typed The text typed by the user.
   * @param lists The suggestions of each source, in order of preference: tabs, bookmarks, history.
   * @param limit The most rows to return.
   * @returns The ranked suggestions.
   */
  public static rank(typed: string, lists: readonly Suggestion[][], limit: number): Suggestion[] {
    const text = fold(typed.trim());
    return SuggestionRanker.#distinct(lists.flat())
      .map((suggestion, order) => ({ suggestion, order, score: scoreOf(suggestion, text) }))
      .filter(({ score }) => score !== NO_MATCH)
      .sort((left, right) => left.score - right.score || left.order - right.order)
      .slice(0, limit)
      .map(({ suggestion }) => suggestion);
  }

  /**
   * The list of an empty field: the pages in the order they come, with no repeated page.
   *
   * @param pages The most recent pages, newest first.
   * @param limit The most rows to return.
   * @returns The same pages, web addresses only and each once.
   */
  public static recent(pages: readonly Suggestion[], limit: number): Suggestion[] {
    return SuggestionRanker.#distinct(pages).slice(0, limit);
  }

  static #distinct(suggestions: readonly Suggestion[]): Suggestion[] {
    const seen = new Set<string>();
    return suggestions.filter((suggestion) => {
      if (!isWebAddress(suggestion.url)) {
        return false;
      }
      const identity = identityOf(suggestion.url);
      const isNew = !seen.has(identity);
      seen.add(identity);
      return isNew;
    });
  }
}
