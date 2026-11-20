import type { Logger } from '../support/Logger.js';
import { ScriptRunner } from './ScriptRunner.js';
import type { LastErrorSource } from './ScriptRunner.js';
import { tabIdOf } from './Webview.js';
import type { ConsoleMessageEvent, LoadCommitEvent, WebviewElement } from './Webview.js';

export interface InjectorDependencies {
  /** Vivaldi's `#webview-container`. */
  container: Element;
  /** Selector of the tab webviews inside the container. */
  webviewSelector: string;
  /** Builds the code to inject into a tab's page, or null to leave that page alone. */
  scriptFor: (tabId: number) => Promise<string | null>;
  /** Code that removes the injected script from a page. */
  uninstallScript: string;
  /** What the script does, for the logs, such as `Peek links`. */
  purpose: string;
  /** Receives console lines of tab pages, with the tab id. */
  onConsoleMessage: (message: string, tabId: number) => void;
  /** Reads `chrome.runtime.lastError` after each injection. */
  errors: LastErrorSource;
  /** Reports failures. */
  logger: Logger;
}

interface Tracked {
  loadCommit: (event: Event) => void;
  consoleMessage: (event: Event) => void;
  request: number;
}

export class PageScriptInjector {
  #deps: InjectorDependencies;
  #tracked = new Map<WebviewElement, Tracked>();
  #observer: MutationObserver | null = null;
  #runner: ScriptRunner;
  #requests = 0;

  /**
   * Keeps a script in the pages of tabs: injects it into each tab webview, again after
   * every top-level navigation, and removes it on detach. The script is chosen per tab.
   *
   * @param dependencies Everything the injector collaborates with.
   */
  constructor(dependencies: InjectorDependencies) {
    this.#deps = dependencies;
    this.#runner = new ScriptRunner(dependencies.purpose, dependencies.errors, dependencies.logger);
  }

  /**
   * Starts following the tab webviews.
   */
  public attach(): void {
    this.#observer = new MutationObserver(() => this.#scan());
    this.#observer.observe(this.#deps.container, { childList: true, subtree: true });
    this.#scan();
  }

  /**
   * Injects the script again into a tab, for example after it was pinned.
   *
   * @param tabId Tab id.
   */
  public refresh(tabId: number): void {
    [...this.#tracked.keys()].filter((webview) => tabIdOf(webview) === tabId).forEach((webview) => this.#inject(webview));
  }

  /**
   * Runs code in the page of a tab the injector follows, such as a command to a script it injected.
   *
   * @param tabId Tab id.
   * @param code Code to run in the page.
   */
  public run(tabId: number, code: string): void {
    [...this.#tracked.keys()].filter((webview) => tabIdOf(webview) === tabId).forEach((webview) => this.#runner.run(webview, code));
  }

  /**
   * Stops following the webviews and removes the script from their pages.
   */
  public detach(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    this.#tracked.forEach((listeners, webview) => {
      webview.removeEventListener('loadcommit', listeners.loadCommit);
      webview.removeEventListener('consolemessage', listeners.consoleMessage);
      this.#runner.run(webview, this.#deps.uninstallScript);
    });
    this.#tracked.clear();
  }

  #scan(): void {
    this.#tracked.forEach((_listeners, webview) => {
      if (!webview.isConnected) {
        this.#tracked.delete(webview);
      }
    });
    this.#deps.container.querySelectorAll<WebviewElement>(this.#deps.webviewSelector).forEach((webview) => {
      if (!this.#tracked.has(webview) && tabIdOf(webview) !== null) {
        this.#track(webview);
      }
    });
  }

  #track(webview: WebviewElement): void {
    const listeners: Tracked = {
      request: 0,
      loadCommit: (event) => {
        if ((event as LoadCommitEvent).isTopLevel) {
          this.#inject(webview);
        }
      },
      consoleMessage: (event) => {
        const tabId = tabIdOf(webview);
        if (tabId !== null) {
          this.#deps.onConsoleMessage((event as ConsoleMessageEvent).message, tabId);
        }
      },
    };
    webview.addEventListener('loadcommit', listeners.loadCommit);
    webview.addEventListener('consolemessage', listeners.consoleMessage);
    this.#tracked.set(webview, listeners);
    this.#inject(webview);
  }

  #inject(webview: WebviewElement): void {
    const tabId = tabIdOf(webview);
    const entry = this.#tracked.get(webview);
    if (tabId === null || entry === undefined) {
      return;
    }
    this.#requests += 1;
    const request = this.#requests;
    entry.request = request;
    this.#deps
      .scriptFor(tabId)
      .then((code) => this.#runLatest(webview, request, code ?? this.#deps.uninstallScript))
      .catch((error: unknown) => this.#deps.logger.error(`Could not prepare ${this.#deps.purpose} for tab ${tabId}`, error));
  }

  #runLatest(webview: WebviewElement, request: number, code: string): void {
    if (this.#tracked.get(webview)?.request === request) {
      this.#runner.run(webview, code);
    }
  }
}
