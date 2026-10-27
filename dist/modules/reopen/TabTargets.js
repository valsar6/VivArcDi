class TabTargets {
  #finders;
  /**
   * Looks for the tab a new tab duplicates in several places, in order: the first finder that
   * has an answer wins.
   *
   * @param finders Finders, most important first.
   */
  constructor(finders) {
    this.#finders = finders;
  }
  /**
   * @param newTab The tab the user just opened.
   * @param url The address it navigates to.
   * @returns The tab to switch to, or null.
   */
  async find(newTab, url) {
    for (const finder of this.#finders) {
      const found = await finder.find(newTab, url);
      if (found !== null) {
        return found;
      }
    }
    return null;
  }
}
export {
  TabTargets
};
