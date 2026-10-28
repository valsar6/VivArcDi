import { TabData } from '../../core/TabData.js';

const ARCHIVABLE_PROTOCOLS = new Set(['http:', 'https:', 'file:']);

export class TodayTabPolicy {
  /**
   * Tells whether a tab is a Today tab that may be archived: not pinned (Favorites are pinned
   * tabs), not in a tab stack, not the active tab of its window, not playing audio, and showing
   * a web page or a file.
   *
   * @param tab A tab.
   * @returns Whether the tab may be closed into the archive.
   */
  public static isArchivable(tab: chrome.tabs.Tab): boolean {
    return tab.pinned !== true && tab.active !== true && tab.audible !== true && TabData.stackOf(tab) === null && TodayTabPolicy.#isPage(tab.url);
  }

  static #isPage(url: string | undefined): boolean {
    try {
      return url !== undefined && ARCHIVABLE_PROTOCOLS.has(new URL(url).protocol);
    } catch {
      return false;
    }
  }
}
