import { KeptTab } from '../../shared/tabs/KeptTab.js';
import { TabData } from '../../core/tabs/TabData.js';

const ARCHIVABLE_PROTOCOLS = new Set(['http:', 'https:', 'file:']);

export class TodayTabPolicy {
  /**
   * Tells whether Clear may close a tab: not kept (pinned, a Favorite, or the tab of a bookmark
   * link), not in a tab stack, not playing audio, and showing a web page or a file. The active
   * tab qualifies: the user asked for Clear.
   *
   * @param tab A tab.
   * @returns Whether Clear may close the tab into the archive.
   */
  public static isClearable(tab: chrome.tabs.Tab): boolean {
    return !KeptTab.is(tab) && tab.audible !== true && TabData.stackOf(tab) === null && TodayTabPolicy.#isPage(tab.url);
  }

  /**
   * Tells whether the sweep may archive a tab: a tab Clear may close that is not the active tab of
   * its window.
   *
   * @param tab A tab.
   * @returns Whether the tab may be closed into the archive on its own.
   */
  public static isArchivable(tab: chrome.tabs.Tab): boolean {
    return tab.active !== true && TodayTabPolicy.isClearable(tab);
  }

  static #isPage(url: string | undefined): boolean {
    try {
      return url !== undefined && ARCHIVABLE_PROTOCOLS.has(new URL(url).protocol);
    } catch {
      return false;
    }
  }
}
