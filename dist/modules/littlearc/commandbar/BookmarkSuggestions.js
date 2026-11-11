import { suggestionOf } from "./Suggestion.js";
class BookmarkSuggestions {
  name = "bookmarks";
  #bookmarks;
  /**
   * The bookmarks that match the typed text, found with `chrome.bookmarks.search`.
   *
   * @param bookmarks The read-only bookmarks API.
   */
  constructor(bookmarks) {
    this.#bookmarks = bookmarks;
  }
  /**
   * @param text What the user typed; nothing is suggested for an empty field.
   * @param limit The most suggestions to return.
   * @returns The matching bookmarks; folders are left out.
   */
  async suggest(text, limit) {
    if (text.trim() === "") {
      return [];
    }
    const nodes = await this.#bookmarks.search(text.trim());
    return nodes.flatMap((node) => node.url === void 0 ? [] : suggestionOf("bookmark", node.url, node.title) ?? []).slice(0, limit);
  }
}
export {
  BookmarkSuggestions
};
