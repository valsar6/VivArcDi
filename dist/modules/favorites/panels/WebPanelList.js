const WEB_PANELS_KEY = "vivaldi.panels.web.elements";
class WebPanelList {
  #deps;
  /**
   * Which of Vivaldi's web panels is a page, and a way to bring one up. It reads the preference
   * and clicks buttons; it never writes or removes a panel.
   *
   * @param dependencies The preferences and the panel bar.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * @param first An address.
   * @param second Another address.
   * @returns Whether they are the same page once the fragment and a trailing slash are dropped.
   */
  static sameAddress(first, second) {
    return WebPanelList.#key(first) === WebPanelList.#key(second);
  }
  /**
   * @returns Whether the panel bar is in the window.
   */
  get available() {
    return this.#deps.bar.available;
  }
  /**
   * @param address The address of a page.
   * @returns The id of the web panel of that page that has a button in the bar, or null.
   */
  async find(address) {
    const elements = await this.#deps.prefs.get(WEB_PANELS_KEY);
    if (!Array.isArray(elements)) {
      return null;
    }
    const shown = new Set(this.#deps.bar.panelIds());
    for (const element of elements) {
      const { id, url } = element ?? {};
      if (typeof id === "string" && typeof url === "string" && shown.has(id) && WebPanelList.sameAddress(url, address)) {
        return id;
      }
    }
    return null;
  }
  /**
   * @param id The id of a panel.
   * @returns Whether its button was in the bar and was clicked.
   */
  show(id) {
    return this.#deps.bar.show(id);
  }
  static #key(address) {
    try {
      const { origin, pathname, search } = new URL(address);
      return `${origin}${pathname.replace(/\/$/, "")}${search}`;
    } catch {
      return address.replace(/#.*$/, "").replace(/\/$/, "");
    }
  }
}
export {
  WEB_PANELS_KEY,
  WebPanelList
};
