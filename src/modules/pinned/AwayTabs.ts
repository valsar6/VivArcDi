import type { BrowserTabs } from '../../core/BrowserTabs.js';
import { OwnPage } from '../../core/OwnPage.js';
import { TabData } from '../../core/TabData.js';

export interface TabMarks {
  /** Pinned tabs, Favorites included, that show another page than their own. */
  away: Set<number>;
  /** Tabs linked to a Favorite, which the grid stands for. */
  linked: Set<number>;
}

export class AwayTabs {
  #tabs: Pick<BrowserTabs, 'query'>;

  /**
   * Reads which pinned tabs of the window left their own page.
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
    const marks: TabMarks = { away: new Set(), linked: new Set() };
    for (const tab of tabs) {
      if (tab.id === undefined || !tab.pinned) {
        continue;
      }
      if (OwnPage.isAway(tab)) {
        marks.away.add(tab.id);
      }
      if (TabData.ownOf(tab).favoriteId !== undefined) {
        marks.linked.add(tab.id);
      }
    }
    return marks;
  }

  /**
   * @returns The marks of the current window.
   */
  public async read(): Promise<TabMarks> {
    return AwayTabs.marksOf(await this.#tabs.query({ currentWindow: true }));
  }
}
