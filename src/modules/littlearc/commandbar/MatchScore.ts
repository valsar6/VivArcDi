import type { Suggestion } from './Suggestion.js';

const MARKS = /\p{Diacritic}/gu;
const NOT_A_WORD = /[^\p{L}\p{N}]+/u;

export const NO_MATCH = Number.POSITIVE_INFINITY;
const STARTS = 0;
const WORD = 1;
const CONTAINS = 2;

/**
 * @param text Any text.
 * @returns The text in lower case and without accents.
 */
export function fold(text: string): string {
  return text.normalize('NFD').replace(MARKS, '').toLowerCase();
}

/**
 * How well a suggestion matches the typed text: 0 when its host or its title starts with it, 1 when a
 * word of the title does, 2 for any other containment in the title, host or address.
 *
 * @param suggestion The suggestion.
 * @param typed The text typed by the user, already folded.
 * @returns The score, lower is better, or `NO_MATCH`.
 */
export function scoreOf(suggestion: Suggestion, typed: string): number {
  const title = fold(suggestion.title);
  const host = fold(suggestion.host);
  if (title.startsWith(typed) || host.startsWith(typed)) {
    return STARTS;
  }
  if (title.split(NOT_A_WORD).some((word) => word.startsWith(typed))) {
    return WORD;
  }
  return [title, host, fold(suggestion.url)].some((field) => field.includes(typed)) ? CONTAINS : NO_MATCH;
}

/**
 * @param suggestion The suggestion.
 * @param text The text typed by the user, in any case and with any accents.
 * @returns Whether the title, the host or the address contains the text.
 */
export function matches(suggestion: Suggestion, text: string): boolean {
  return scoreOf(suggestion, fold(text.trim())) !== NO_MATCH;
}
