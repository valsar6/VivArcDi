import { ScriptRunner } from "./ScriptRunner.js";
import { tabIdOf } from "./Webview.js";
class PageScriptInjector {
  #deps;
  #tracked = /* @__PURE__ */ new Map();
  #observer = null;
  #runner;
  #requests = 0;
  /**
   * Keeps a script in the pages of tabs: injects it into each tab webview, again after
   * every top-level navigation, and removes it on detach. The script is chosen per tab.
   *
   * @param dependencies Everything the injector collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
    this.#runner = new ScriptRunner(dependencies.purpose, dependencies.errors, dependencies.logger);
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
      this.#runner.run(webview, this.#deps.uninstallScript);
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
      request: 0,
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
    const entry = this.#tracked.get(webview);
    if (tabId === null || entry === void 0) {
      return;
    }
    this.#requests += 1;
    const request = this.#requests;
    entry.request = request;
    this.#deps.scriptFor(tabId).then((code) => this.#runLatest(webview, request, code ?? this.#deps.uninstallScript)).catch((error) => this.#deps.logger.error(`Could not prepare ${this.#deps.purpose} for tab ${tabId}`, error));
  }
  #runLatest(webview, request, code) {
    if (this.#tracked.get(webview)?.request === request) {
      this.#runner.run(webview, code);
    }
  }
}
export {
  PageScriptInjector
};
