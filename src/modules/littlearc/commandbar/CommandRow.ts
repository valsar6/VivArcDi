import { BrowserSearch } from '../../../core/browser/BrowserSearch.js';
import { AddressResolver } from '../AddressResolver.js';
import type { Suggestion } from './Suggestion.js';

export const MAX_ROWS = 5;

export type RowIcon = 'search' | 'globe' | 'favicon';

export interface CommandRow {
  /** The address that Enter opens. */
  url: string;
  title: string;
  /** Empty for the row of the typed text. */
  host: string;
  icon: RowIcon;
  favicon?: string | undefined;
}

const LEADING_WWW = /^www\./;

/**
 * The first row of a list, made of the typed text: a search, or the address when the text looks like
 * one. A search opens the fallback address because `chrome.search.query` is missing in the main window.
 *
 * @param text What the user typed.
 * @returns The row, or null when the text is empty.
 */
export function typedRow(text: string): CommandRow | null {
  const resolved = AddressResolver.resolve(text);
  if (resolved === null) {
    return null;
  }
  if (resolved.kind === 'search') {
    return { url: BrowserSearch.fallbackAddress(resolved.text), title: `Search for ${resolved.text}`, host: '', icon: 'search' };
  }
  return { url: resolved.url, title: `Open ${new URL(resolved.url).host.replace(LEADING_WWW, '')}`, host: '', icon: 'globe' };
}

/**
 * @param suggestion A suggestion.
 * @returns Its row.
 */
export function suggestionRow(suggestion: Suggestion): CommandRow {
  return { url: suggestion.url, title: suggestion.title, host: suggestion.host, icon: 'favicon', favicon: suggestion.favicon };
}
