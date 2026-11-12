import type { ToastTimers } from '../../core/Toast.js';
import type { ConnectFlow, ConnectState } from './ConnectFlow.js';
import type { TextCopier } from '../copyurl/UrlCopier.js';

export const PANEL_ATTRIBUTE = 'data-vivarcdi-connect-panel';
export const CODE_ATTRIBUTE = 'data-vivarcdi-connect-code';

export interface ConnectPanelDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** The element that receives the panel, such as `#browser`. */
  parent: () => Element;
  flow: Pick<ConnectFlow, 'run' | 'cancel'>;
  copier: Pick<TextCopier, 'write'>;
  /** Opens an address in a new tab of the active workspace. */
  openPage: (url: string) => void;
  /** How long `Connected as <login>` stays before the panel closes, in milliseconds. */
  closeAfterMs: number;
  timers?: ToastTimers;
}

export const COPY_LABEL = 'Copy code and open GitHub';
export const CANCEL_LABEL = 'Cancel';
export const RETRY_LABEL = 'Try again';

const defaultTimers: ToastTimers = {
  set: (run, delayMs) => setTimeout(run, delayMs),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export class ConnectPanel {
  #deps: ConnectPanelDependencies;
  #timers: ToastTimers;
  #element: HTMLElement | null = null;
  #closing: unknown = null;
  #onKey = (event: Event): void => this.#key(event as KeyboardEvent);

  /**
   * The small panel below a live folder where the user connects GitHub: the code GitHub returned
   * in large letters, `Copy code and open GitHub`, and `Cancel`. It says `Waiting for GitHub…`
   * while the user authorizes, `Connected as <login>` for a moment when GitHub returned a token,
   * and why it failed with `Try again` when the code expired or access was denied. It closes on
   * Cancel and on Escape, which cancels the flow, but not on a click elsewhere, because the user
   * has to go to GitHub's tab and come back.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: ConnectPanelDependencies) {
    this.#deps = dependencies;
    this.#timers = dependencies.timers ?? defaultTimers;
  }

  /**
   * Opens the panel at a point, closing the one that is open, and starts connecting.
   *
   * @param x Horizontal position in the window.
   * @param y Vertical position in the window.
   */
  public open(x: number, y: number): void {
    this.close();
    const element = this.#deps.document.createElement('div');
    element.setAttribute(PANEL_ATTRIBUTE, '');
    element.setAttribute('role', 'dialog');
    element.style.setProperty('left', `${x}px`);
    element.style.setProperty('top', `${y}px`);
    element.addEventListener('keydown', this.#onKey);
    this.#deps.parent().append(element);
    this.#element = element;
    this.#start();
  }

  /**
   * Closes the panel and cancels what it was waiting for, if it is open.
   */
  public close(): void {
    this.#cancelClosing();
    if (this.#element !== null) {
      this.#deps.flow.cancel();
    }
    this.#element?.remove();
    this.#element = null;
  }

  #start(): void {
    void this.#deps.flow.run((state) => this.#show(state));
  }

  #show(state: ConnectState): void {
    const element = this.#element;
    if (element === null) {
      return;
    }
    element.replaceChildren(...this.#content(state));
    element.querySelector<HTMLElement>('button')?.focus();
    if (state.step === 'connected') {
      this.#closing = this.#timers.set(() => this.close(), this.#deps.closeAfterMs);
    }
  }

  #content(state: ConnectState): HTMLElement[] {
    switch (state.step) {
      case 'asking':
        return [this.#text('Asking GitHub for a code…'), this.#button(CANCEL_LABEL, () => this.close())];
      case 'code':
        return [this.#code(state.userCode), this.#text('Waiting for GitHub…'), this.#button(COPY_LABEL, () => this.#copyAndOpen(state)), this.#button(CANCEL_LABEL, () => this.close())];
      case 'connected':
        return [this.#text(state.login === '' ? 'Connected' : `Connected as ${state.login}`)];
      case 'failed':
        return [this.#text(state.message), this.#button(RETRY_LABEL, () => this.#start()), this.#button(CANCEL_LABEL, () => this.close())];
    }
  }

  #copyAndOpen({ userCode, verificationUri }: { userCode: string; verificationUri: string }): void {
    const open = (): void => this.#deps.openPage(verificationUri);
    this.#deps.copier.write(userCode).then(open, open);
  }

  #code(userCode: string): HTMLElement {
    const code = this.#text(userCode);
    code.setAttribute(CODE_ATTRIBUTE, '');
    return code;
  }

  #text(text: string): HTMLElement {
    const element = this.#deps.document.createElement('div');
    element.textContent = text;
    return element;
  }

  #button(label: string, run: () => void): HTMLElement {
    const button = this.#deps.document.createElement('button');
    button.setAttribute('type', 'button');
    button.textContent = label;
    button.addEventListener('click', run);
    return button;
  }

  #cancelClosing(): void {
    if (this.#closing !== null) {
      this.#timers.clear(this.#closing);
      this.#closing = null;
    }
  }

  #key(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close();
    }
  }
}
