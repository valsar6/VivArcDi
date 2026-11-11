import { SuggestionRanker } from "./SuggestionRanker.js";
const MAX_PER_SOURCE = 20;
class SuggestionList {
  #sources;
  #logger;
  #failed = /* @__PURE__ */ new Set();
  /**
   * Collects the suggestions of the sources and ranks them. A source that fails is skipped and its
   * failure is logged once.
   *
   * @param sources The sources for typed text and the one for the empty field.
   * @param logger Where failures are logged.
   */
  constructor(sources, logger) {
    this.#sources = sources;
    this.#logger = logger;
  }
  /**
   * @param text What the user typed; empty for the most recent pages.
   * @param limit The most rows to return.
   * @returns The ranked suggestions.
   */
  async suggest(text, limit) {
    if (text.trim() === "") {
      return SuggestionRanker.recent(await this.#collect(this.#sources.recent, text), limit);
    }
    const lists = await Promise.all(this.#sources.typed.map((source) => this.#collect(source, text)));
    return SuggestionRanker.rank(text, lists, limit);
  }
  async #collect(source, text) {
    try {
      return await source.suggest(text, MAX_PER_SOURCE);
    } catch (error) {
      if (!this.#failed.has(source.name)) {
        this.#failed.add(source.name);
        this.#logger.warn(`the suggestions from ${source.name} are not available`, error);
      }
      return [];
    }
  }
}
export {
  MAX_PER_SOURCE,
  SuggestionList
};
