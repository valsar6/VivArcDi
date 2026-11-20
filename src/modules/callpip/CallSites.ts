import type { SelectorCatalog } from '../../core/dom/SelectorCatalog.js';
import type { CallPipOptions } from './CallPipOptions.js';

export interface CallSite {
  /** The option that turns the site on and off. */
  id: 'meet';
  /** Host names of the site's call pages. */
  hosts: readonly string[];
  /** Name of the selector of the in-call view in the selector catalog. */
  selectorKey: string;
}

export const CALL_SITES: readonly CallSite[] = [{ id: 'meet', hosts: ['meet.google.com'], selectorKey: 'callMeetInCall' }];

/**
 * Finds the enabled site a page address belongs to.
 *
 * @param url Address of a tab.
 * @param options The module's options.
 * @returns The site and its in-call selector, or null when the page is not on an enabled site or the
 * catalog has no selector for it.
 */
export function siteFor(url: string | undefined, options: CallPipOptions, selectors: SelectorCatalog): { site: CallSite; inCallSelector: string } | null {
  const host = hostOf(url);
  const site = CALL_SITES.find((candidate) => options[candidate.id] && host !== null && candidate.hosts.includes(host));
  if (site === undefined || !selectors.has(site.selectorKey)) {
    return null;
  }
  return { site, inCallSelector: selectors.get(site.selectorKey) };
}

function hostOf(url: string | undefined): string | null {
  try {
    const parsed = new URL(url ?? '');
    return parsed.protocol === 'https:' ? parsed.hostname : null;
  } catch {
    return null;
  }
}
