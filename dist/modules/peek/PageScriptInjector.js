import { tabIdOf } from "./Webview.js";
class PageScriptInjector {
  #deps;
  #tracked = /* @__PURE__ */ new Map();
  #observer = null;
  #warned = false;
  /**
   * Keeps the Peek page script in every tab's page: injects it into each tab webview,
   * again after every top-level navigation, and removes it on detach.
   *
   * @param dependencies Everything the injector collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * Starts following the tab webviews.
   */
  attach() {
    this.#observer = new MutationObserver(() => this.#scan());
    this.#observer.observe(this.#deps.container, { childList: true, subtree: true });
    this.#scan();
  }
  /**
   * Injects the script again into a tab, for example after it was pinned.
   *
   * @param tabId Tab id.
   */
  refresh(tabId) {
    [...this.#tracked.keys()].filter((webview) => tabIdOf(webview) === tabId).forEach((webview) => this.#inject(webview));
  }
  /**
   * Stops following the webviews and removes the script from their pages.
   */
  detach() {
    this.#observer?.disconnect();
    this.#observer = null;
    this.#tracked.forEach((listeners, webview) => {
      webview.removeEventListener("loadcommit", listeners.loadCommit);
      webview.removeEventListener("consolemessage", listeners.consoleMessage);
      this.#execute(webview, this.#deps.scripts.uninstallLinks());
    });
    this.#tracked.clear();
  }
  #scan() {
    this.#tracked.forEach((_listeners, webview) => {
      if (!webview.isConnected) {
        this.#tracked.delete(webview);
      }
    });
    this.#deps.container.querySelectorAll(this.#deps.webviewSelector).forEach((webview) => {
      if (!this.#tracked.has(webview) && tabIdOf(webview) !== null) {
        this.#track(webview);
      }
    });
  }
  #track(webview) {
    const listeners = {
      loadCommit: (event) => {
        if (event.isTopLevel) {
          this.#inject(webview);
        }
      },
      consoleMessage: (event) => {
        const tabId = tabIdOf(webview);
        if (tabId !== null) {
          this.#deps.onConsoleMessage(event.message, tabId);
        }
      }
    };
    webview.addEventListener("loadcommit", listeners.loadCommit);
    webview.addEventListener("consolemessage", listeners.consoleMessage);
    this.#tracked.set(webview, listeners);
    this.#inject(webview);
  }
  #inject(webview) {
    const tabId = tabIdOf(webview);
    if (tabId === null) {
      return;
    }
    this.#deps.policyFor(tabId).then((policy) => this.#execute(webview, this.#deps.scripts.installLinks(policy))).catch((error) => this.#deps.logger.error(`Could not prepare Peek for tab ${tabId}`, error));
  }
  #execute(webview, code) {
    try {
      webview.executeScript({ code });
    } catch (error) {
      if (!this.#warned) {
        this.#warned = true;
        this.#deps.logger.warn("Cannot inject into pages, Peek links stay with Vivaldi", error);
      }
    }
  }
}
export {
  PageScriptInjector
};
