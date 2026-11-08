import type { FocusHistory } from './FocusHistory.js';

const WEB_ADDRESS = /^https?:\/\//i;
export const FOCUS_WINDOW_MS = 100;

export class ExternalLinkDetector {
  #history: FocusHistory;
  #isLittleArc: (windowId: number) => boolean;

  /**
   * Tells whether a new tab is a link opened from another app. Seen on Vivaldi 8.2 for macOS: such a
   * tab is active, has no opener, has a web address, lands in a normal window and appears within a
   * few milliseconds of the application coming to the foreground.
   *
   * @param history The focus events of the browser's windows.
   * @param isLittleArc Tells whether a window is a Little Arc window.
   */
  constructor(history: FocusHistory, isLittleArc: (windowId: number) => boolean) {
    this.#history = history;
    this.#isLittleArc = isLittleArc;
  }

  /**
   * @param tab The new tab, read again a moment after it appeared.
   * @param createdAt When the tab appeared, in milliseconds.
   * @returns Whether the tab is a link from another app.
   */
  public accepts(tab: chrome.tabs.Tab, createdAt: number): boolean {
    const address = tab.pendingUrl ?? tab.url ?? '';
    return (
      tab.openerTabId === undefined &&
      tab.active &&
      WEB_ADDRESS.test(address) &&
      !(tab.windowId !== undefined && this.#isLittleArc(tab.windowId)) &&
      this.#history.broughtForwardNear(createdAt, FOCUS_WINDOW_MS)
    );
  }
}
