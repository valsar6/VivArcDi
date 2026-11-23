import type { BrowserTabs } from '../../core/browser/BrowserTabs.js';
import { TabData } from '../../core/tabs/TabData.js';

export interface TabMarks {
  /** Tabs linked to a Favorite, which the grid stands for. */
  linked: Set<number>;
}

export class PinnedMarks {
  #tabs: Pick<BrowserTabs, 'query'>;

  /**
   * Reads which pinned tabs of the window are linked to a Favorite, which the grid stands for.
   *
   * @param tabs Tabs API.
   */
  constructor(tabs: Pick<BrowserTabs, 'query'>) {
    this.#tabs = tabs;
  }

  /**
   * @param tabs Tabs of a window.
   * @returns What the tab bar marks on them.
   */
  public static marksOf(tabs: chrome.tabs.Tab[]): TabMarks {
    const marks: TabMarks = { linked: new Set() };
    for (const tab of tabs) {
      if (tab.id !== undefined && tab.pinned === true && TabData.ownOf(tab).favoriteId !== undefined) {
        marks.linked.add(tab.id);
      }
    }
    return marks;
  }

  /**
   * @returns The marks of the current window.
   */
  public async read(): Promise<TabMarks> {
    return PinnedMarks.marksOf(await this.#tabs.query({ currentWindow: true }));
  }
}
