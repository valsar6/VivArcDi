import { suggestionOf } from "./Suggestion.js";
class HistorySuggestions {
  name = "history";
  #history;
  /**
   * The visited pages: the ones that match the typed text, or, for an empty field, the most recent
   * ones. `chrome.history.search` gives them newest first.
   *
   * @param history The read-only history API.
   */
  constructor(history) {
    this.#history = history;
  }
  /**
   * @param text What the user typed, or nothing for the most recent pages.
   * @param limit The most suggestions to return.
   * @returns The pages, newest first.
   */
  async suggest(text, limit) {
    const items = await this.#history.search(text.trim(), limit);
    return items.flatMap((item) => suggestionOf("history", item.url, item.title) ?? []);
  }
}
export {
  HistorySuggestions
};
