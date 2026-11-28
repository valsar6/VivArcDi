import type { SelectorCatalog } from '../../core/dom/SelectorCatalog.js';
import type { CallSelectors } from './CallMessage.js';
import type { CallPipOptions } from './CallPipOptions.js';

export interface CallSite {
  /** The option that turns the site on and off. */
  id: 'meet';
  /** Host names of the site's call pages. */
  hosts: readonly string[];
  /** Name in the selector catalog of each selector of the call page. */
  selectorKeys: Record<keyof CallSelectors, string>;
}

export const CALL_SITES: readonly CallSite[] = [
  {
    id: 'meet',
    hosts: ['meet.google.com'],
    selectorKeys: {
      inCall: 'callMeetInCall',
      tile: 'callMeetTile',
      avatar: 'callMeetTileAvatar',
      microphone: 'callMeetMicrophone',
      camera: 'callMeetCamera',
    },
  },
];

/**
 * Finds the enabled site a page address belongs to.
 *
 * @param url Address of a tab.
 * @param options The module's options.
 * @returns The site and its selectors, or null when the page is not on an enabled site or the
 * catalog lacks one of its selectors.
 */
export function siteFor(url: string | undefined, options: CallPipOptions, selectors: SelectorCatalog): { site: CallSite; selectors: CallSelectors } | null {
  const host = hostOf(url);
  const site = CALL_SITES.find((candidate) => options[candidate.id] && host !== null && candidate.hosts.includes(host));
  if (site === undefined || !Object.values(site.selectorKeys).every((key) => selectors.has(key))) {
    return null;
  }
  const resolved = Object.fromEntries(Object.entries(site.selectorKeys).map(([name, key]) => [name, selectors.get(key)])) as unknown as CallSelectors;
  return { site, selectors: resolved };
}

function hostOf(url: string | undefined): string | null {
  try {
    const parsed = new URL(url ?? '');
    return parsed.protocol === 'https:' ? parsed.hostname : null;
  } catch {
    return null;
  }
}
