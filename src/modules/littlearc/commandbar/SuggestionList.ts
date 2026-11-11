import type { Logger } from '../../../core/Logger.js';
import type { Suggestion } from './Suggestion.js';
import { SuggestionRanker } from './SuggestionRanker.js';
import type { SuggestionSource } from './SuggestionSource.js';

export const MAX_PER_SOURCE = 20;

export interface SuggestionSources {
  /** For typed text, in order of preference. */
  typed: readonly SuggestionSource[];
  /** For the empty field. */
  recent: SuggestionSource;
}

export class SuggestionList {
  #sources: SuggestionSources;
  #logger: Logger;
  #failed = new Set<string>();

  /**
   * Collects the suggestions of the sources and ranks them. A source that fails is skipped and its
   * failure is logged once.
   *
   * @param sources The sources for typed text and the one for the empty field.
   * @param logger Where failures are logged.
   */
  constructor(sources: SuggestionSources, logger: Logger) {
    this.#sources = sources;
    this.#logger = logger;
  }

  /**
   * @param text What the user typed; empty for the most recent pages.
   * @param limit The most rows to return.
   * @returns The ranked suggestions.
   */
  public async suggest(text: string, limit: number): Promise<Suggestion[]> {
    if (text.trim() === '') {
      return SuggestionRanker.recent(await this.#collect(this.#sources.recent, text), limit);
    }
    const lists = await Promise.all(this.#sources.typed.map((source) => this.#collect(source, text)));
    return SuggestionRanker.rank(text, lists, limit);
  }

  async #collect(source: SuggestionSource, text: string): Promise<Suggestion[]> {
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
