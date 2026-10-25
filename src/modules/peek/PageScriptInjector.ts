import type { Logger } from '../../core/Logger.js';
import type { PagePolicy, PageScripts } from './PageScripts.js';
import { tabIdOf } from './Webview.js';
import type { ConsoleMessageEvent, LoadCommitEvent, WebviewElement } from './Webview.js';

export interface InjectorDependencies {
  /** Vivaldi's `#webview-container`. */
  container: Element;
  /** Selector of the tab webviews inside the container. */
  webviewSelector: string;
  /** The code to inject. */
  scripts: PageScripts;
  /** Builds the policy of a tab. */
  policyFor: (tabId: number) => Promise<PagePolicy>;
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
   * Keeps the Peek page script in every tab's page: injects it into each tab webview,
   * again after every top-level navigation, and removes it on detach.
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
      this.#execute(webview, this.#deps.scripts.uninstallLinks());
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
      .policyFor(tabId)
      .then((policy) => this.#execute(webview, this.#deps.scripts.installLinks(policy)))
      .catch((error: unknown) => this.#deps.logger.error(`Could not prepare Peek for tab ${tabId}`, error));
  }

  #execute(webview: WebviewElement, code: string): void {
    try {
      webview.executeScript({ code });
    } catch (error) {
      if (!this.#warned) {
        this.#warned = true;
        this.#deps.logger.warn('Cannot inject into pages, Peek links stay with Vivaldi', error);
      }
    }
  }
}
