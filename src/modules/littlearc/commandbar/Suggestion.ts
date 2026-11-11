export type SuggestionOrigin = 'tab' | 'bookmark' | 'history';

export interface Suggestion {
  url: string;
  title: string;
  host: string;
  source: SuggestionOrigin;
  favicon?: string | undefined;
}

const LEADING_WWW = /^www\./;

/**
 * Makes a suggestion from what a source reports.
 *
 * @param source Where it comes from.
 * @param url Its address.
 * @param title Its title; the host stands in for an empty one.
 * @param favicon The favicon of an open tab, if known.
 * @returns The suggestion, or null when the address cannot be read.
 */
export function suggestionOf(source: SuggestionOrigin, url: string | undefined, title: string | undefined, favicon?: string): Suggestion | null {
  try {
    const host = new URL(url ?? '').host.replace(LEADING_WWW, '');
    const text = (title ?? '').trim();
    return { url: url ?? '', title: text === '' ? host : text, host, source, favicon };
  } catch {
    return null;
  }
}
