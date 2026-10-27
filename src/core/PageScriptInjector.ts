import type { Logger } from './Logger.js';
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
  /** Reports failures. */
  logger: Logger;
}

interface Tracked {
  loadCommit: (event: Event) => void;
  consoleMessage: (event: Event) => void;
}

export class PageScriptInjector {
  #deps: InjectorDependencies;
  #tracked = new Map<WebviewElement, Tracked>();
  #observer: MutationObserver | null = null;
  #warned = false;

  /**
   * Keeps a script in the pages of tabs: injects it into each tab webview, again after
   * every top-level navigation, and removes it on detach. The script is chosen per tab.
   *
   * @param dependencies Everything the injector collaborates with.
   */
  constructor(dependencies: InjectorDependencies) {
    this.#deps = dependencies;
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
   * Stops following the webviews and removes the script from their pages.
   */
  public detach(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    this.#tracked.forEach((listeners, webview) => {
      webview.removeEventListener('loadcommit', listeners.loadCommit);
      webview.removeEventListener('consolemessage', listeners.consoleMessage);
      this.#execute(webview, this.#deps.uninstallScript);
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
    if (tabId === null) {
      return;
    }
    this.#deps
      .scriptFor(tabId)
      .then((code) => this.#execute(webview, code ?? this.#deps.uninstallScript))
      .catch((error: unknown) => this.#deps.logger.error(`Could not prepare ${this.#deps.purpose} for tab ${tabId}`, error));
  }

  #execute(webview: WebviewElement, code: string): void {
    try {
      webview.executeScript({ code });
    } catch (error) {
      if (!this.#warned) {
        this.#warned = true;
        this.#deps.logger.warn(`Cannot inject into pages: ${this.#deps.purpose} are off`, error);
      }
    }
  }
}
