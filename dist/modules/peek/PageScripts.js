const LINKS_PATH = "page/peek-links.js";
const KEYS_PATH = "page/peek-keys.js";
const LINKS_GLOBAL = "VivArcDiPeekLinks";
const KEYS_GLOBAL = "VivArcDiPeekKeys";
class PageScripts {
  #links;
  #keys;
  /**
   * The code VivArcDi injects into pages with `webview.executeScript`.
   * Each bundle defines one global object whose functions are called after it.
   *
   * @param links Bundle of `src/page/peek-links.ts`.
   * @param keys Bundle of `src/page/peek-keys.ts`.
   */
  constructor(links, keys) {
    this.#links = links;
    this.#keys = keys;
  }
  /**
   * @param payload Loads the bundles from the payload folder.
   * @returns The scripts, ready to inject.
   */
  static async load(payload) {
    const [links, keys] = await Promise.all([payload.text(LINKS_PATH), payload.text(KEYS_PATH)]);
    return new PageScripts(links, keys);
  }
  /**
   * @param policy Triggers and the state of the tab.
   * @returns Code that starts catching Peek clicks in a tab's page.
   */
  installLinks(policy) {
    return `${this.#links}
${LINKS_GLOBAL}.install(${JSON.stringify(policy)});`;
  }
  /**
   * @returns Code that stops catching clicks in a page.
   */
  uninstallLinks() {
    return `globalThis.${LINKS_GLOBAL}?.uninstall();`;
  }
  /**
   * @param token Secret that proves a message comes from the injected script.
   * @returns Code that forwards Peek keys from the page shown in the panel.
   */
  installKeys(token) {
    return `${this.#keys}
${KEYS_GLOBAL}.install(${JSON.stringify(token)});`;
  }
}
export {
  PageScripts
};
