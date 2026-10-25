import type { PageScripts } from './PageScripts.js';
import type { ConsoleMessageEvent, LoadCommitEvent, NewWindowEvent, WebviewElement } from './Webview.js';

export type PanelCommand = 'close' | 'expand' | 'split';

export const BACKDROP_CLASS = 'vivarcdi-peek-backdrop';
export const PANEL_CLASS = 'vivarcdi-peek-panel';

export interface PanelSize {
  /** Width as a percentage of the page area. */
  widthPercent: number;
  /** Height as a percentage of the page area. */
  heightPercent: number;
}

export interface PanelDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** Vivaldi's `#webview-container`, which the panel covers. */
  container: HTMLElement;
  /** Panel size. */
  size: PanelSize;
  /** Storage partition of the tab webviews, so the panel shares their sign-ins. */
  partition: string | null;
  /** Code injected into the panel page. */
  scripts: PageScripts;
  /** Secret given to the injected code. */
  token: string;
  /** Called when a button or the backdrop is used. */
  onCommand: (command: PanelCommand) => void;
  /** Receives console lines of the panel page. */
  onConsoleMessage: (message: string) => void;
}

const BUTTONS: Array<[PanelCommand, string, string]> = [
  ['expand', 'Open as tab', '↗'],
  ['split', 'Show side by side', '◫'],
  ['close', 'Close', '✕'],
];

export class PeekPanel {
  #deps: PanelDependencies;
  #backdrop: HTMLElement;
  #panel: HTMLElement;
  #webview: WebviewElement;
  #url: string;

  /**
   * The Peek: a dimmed backdrop over the page area and a rounded panel above it
   * that shows the real page in its own webview, with Expand, Split and Close buttons.
   *
   * @param url Address to show.
   * @param dependencies Everything the panel collaborates with.
   */
  constructor(url: string, dependencies: PanelDependencies) {
    this.#deps = dependencies;
    this.#url = url;
    this.#backdrop = this.#element('div', BACKDROP_CLASS);
    this.#backdrop.addEventListener('click', () => dependencies.onCommand('close'));
    this.#webview = this.#createWebview(url);
    this.#panel = this.#createPanel();
    dependencies.container.append(this.#backdrop, this.#panel);
  }

  /**
   * @returns The address the panel shows now, after any navigation inside it.
   */
  public get url(): string {
    return this.#url;
  }

  /**
   * Removes the panel and its page.
   */
  public remove(): void {
    this.#backdrop.remove();
    this.#panel.remove();
  }

  #createPanel(): HTMLElement {
    const panel = this.#element('div', PANEL_CLASS);
    panel.style.setProperty('--vivarcdi-peek-width', `${this.#deps.size.widthPercent}%`);
    panel.style.setProperty('--vivarcdi-peek-height', `${this.#deps.size.heightPercent}%`);
    const toolbar = this.#element('div', 'vivarcdi-peek-toolbar');
    BUTTONS.forEach(([command, label, glyph]) => toolbar.append(this.#button(command, label, glyph)));
    panel.append(toolbar, this.#webview);
    return panel;
  }

  #button(command: PanelCommand, label: string, glyph: string): HTMLElement {
    const button = this.#element('button', `vivarcdi-peek-${command}`);
    button.title = label;
    button.setAttribute('aria-label', label);
    button.textContent = glyph;
    button.addEventListener('click', () => this.#deps.onCommand(command));
    return button;
  }

  #createWebview(url: string): WebviewElement {
    const webview = this.#element('webview', 'vivarcdi-peek-page') as WebviewElement;
    if (this.#deps.partition !== null) {
      webview.setAttribute('partition', this.#deps.partition);
    }
    webview.addEventListener('loadcommit', (event) => this.#onLoadCommit(event as LoadCommitEvent));
    webview.addEventListener('newwindow', (event) => {
      event.preventDefault();
      webview.src = (event as NewWindowEvent).targetUrl;
    });
    webview.addEventListener('consolemessage', (event) =>
      this.#deps.onConsoleMessage((event as ConsoleMessageEvent).message),
    );
    webview.src = url;
    return webview;
  }

  #onLoadCommit(event: LoadCommitEvent): void {
    if (!event.isTopLevel) {
      return;
    }
    this.#url = event.url;
    try {
      this.#webview.executeScript({ code: this.#deps.scripts.installKeys(this.#deps.token) });
    } catch {
      return;
    }
  }

  #element(tagName: string, className: string): HTMLElement {
    const element = this.#deps.document.createElement(tagName);
    element.className = className;
    return element;
  }
}
