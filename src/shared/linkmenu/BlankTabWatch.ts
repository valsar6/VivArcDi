import type { BrowserTabs } from '../../core/browser/BrowserTabs.js';

const BLANK_MARKS = ['newtab', 'startpage'];

export class BlankTabWatch {
  #tabs: Pick<BrowserTabs, 'onUpdated' | 'onRemoved'>;
  #stops: Array<() => void> = [];

  /**
   * Waits for a blank tab that the user may close without choosing a page.
   *
   * @param tabs The tabs API.
   */
  constructor(tabs: Pick<BrowserTabs, 'onUpdated' | 'onRemoved'>) {
    this.#tabs = tabs;
  }

  /**
   * Watches one blank tab until it gets a page or closes; one watch at a time.
   *
   * @param tabId The blank tab.
   * @param onAbandoned Runs once when the tab closes while still blank.
   */
  public start(tabId: number, onAbandoned: () => void): void {
    this.stop();
    this.#stops.push(
      this.#tabs.onUpdated((id, change) => {
        if (id === tabId && change.url !== undefined && !BlankTabWatch.#isBlank(change.url)) {
          this.stop();
        }
      }),
      this.#tabs.onRemoved((id) => {
        if (id === tabId) {
          this.stop();
          onAbandoned();
        }
      }),
    );
  }

  /**
   * Removes the listeners.
   */
  public stop(): void {
    this.#stops.forEach((stop) => stop());
    this.#stops = [];
  }

  static #isBlank(url: string): boolean {
    return url === '' || BLANK_MARKS.some((mark) => url.includes(mark));
  }
}
