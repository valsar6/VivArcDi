import { matches } from "./MatchScore.js";
import { suggestionOf } from "./Suggestion.js";
class TabSuggestions {
  name = "open tabs";
  #tabs;
  #isLittleArc;
  /**
   * The open tabs of the normal windows, for typed text. The tabs of Little Arc windows and of
   * private windows are left out.
   *
   * @param tabs The tabs API.
   * @param isLittleArc Whether a window is a Little Arc window.
   */
  constructor(tabs, isLittleArc) {
    this.#tabs = tabs;
    this.#isLittleArc = isLittleArc;
  }
  /**
   * @param text What the user typed; nothing is suggested for an empty field.
   * @param limit The most suggestions to return.
   * @returns The open tabs that match, in the order Vivaldi lists them.
   */
  async suggest(text, limit) {
    if (text.trim() === "") {
      return [];
    }
    const tabs = await this.#tabs.query({ windowType: "normal" });
    return tabs.filter((tab) => tab.incognito !== true && !this.#isLittleArc(tab.windowId)).flatMap((tab) => suggestionOf("tab", tab.url, tab.title, tab.favIconUrl) ?? []).filter((suggestion) => matches(suggestion, text)).slice(0, limit);
  }
}
export {
  TabSuggestions
};
