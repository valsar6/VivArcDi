import type { Suggestion } from './Suggestion.js';

export interface SuggestionSource {
  /** What the log calls the source. */
  readonly name: string;

  /**
   * @param text What the user typed; empty for the list of the empty field.
   * @param limit The most suggestions to return.
   * @returns The suggestions that match, best first for this source.
   */
  suggest(text: string, limit: number): Promise<Suggestion[]>;
}
