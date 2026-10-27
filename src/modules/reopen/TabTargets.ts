export interface TabFinder {
  find(newTab: chrome.tabs.Tab, url: string): Promise<chrome.tabs.Tab | null>;
}

export class TabTargets implements TabFinder {
  #finders: TabFinder[];

  /**
   * Looks for the tab a new tab duplicates in several places, in order: the first finder that
   * has an answer wins.
   *
   * @param finders Finders, most important first.
   */
  constructor(finders: TabFinder[]) {
    this.#finders = finders;
  }

  /**
   * @param newTab The tab the user just opened.
   * @param url The address it navigates to.
   * @returns The tab to switch to, or null.
   */
  public async find(newTab: chrome.tabs.Tab, url: string): Promise<chrome.tabs.Tab | null> {
    for (const finder of this.#finders) {
      const found = await finder.find(newTab, url);
      if (found !== null) {
        return found;
      }
    }
    return null;
  }
}
