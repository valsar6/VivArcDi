import { AddressKey } from './AddressKey.js';
import { TabData } from './TabData.js';

export class OwnPage {
  /**
   * @param tab A tab.
   * @returns The address the tab goes back to on reset, or null when VivArcDi saved none.
   */
  public static of(tab: chrome.tabs.Tab): string | null {
    return TabData.ownOf(tab).pinnedUrl ?? null;
  }

  /**
   * A tab is away when it shows another host or path than its own page, compared like 007's
   * address keys, so a different query string or fragment does not count.
   *
   * @param tab A tab.
   * @returns Whether the tab has an own page and shows another one.
   */
  public static isAway(tab: chrome.tabs.Tab): boolean {
    const own = AddressKey.from(OwnPage.of(tab) ?? undefined);
    const shown = AddressKey.from(tab.url ?? tab.pendingUrl);
    return own !== null && shown !== null && own !== shown;
  }

  /**
   * @param tab A tab.
   * @returns The own page to load on reset when the tab is away, otherwise null.
   */
  public static resetTarget(tab: chrome.tabs.Tab): string | null {
    return OwnPage.isAway(tab) ? OwnPage.of(tab) : null;
  }

  /**
   * @param tab A tab.
   * @returns The address key of the tab's own page, or of the page it shows when it has none.
   */
  public static keyOf(tab: chrome.tabs.Tab): string | null {
    return AddressKey.from(OwnPage.of(tab) ?? tab.url ?? tab.pendingUrl);
  }
}
