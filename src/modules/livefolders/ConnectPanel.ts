import type { ToastKind, ToastTimers } from '../../core/dom/Toast.js';
import type { ConnectFlow, ConnectState } from './ConnectFlow.js';
import type { TextCopier } from '../../shared/clipboard/TextCopier.js';

export const PANEL_ATTRIBUTE = 'data-vivarcdi-connect-panel';
export const CODE_ATTRIBUTE = 'data-vivarcdi-connect-code';
export const PRIMARY_ATTRIBUTE = 'data-vivarcdi-connect-primary';
export const HEADER_ATTRIBUTE = 'data-vivarcdi-connect-header';
export const HELP_ATTRIBUTE = 'data-vivarcdi-connect-help';
export const CHAR_ATTRIBUTE = 'data-vivarcdi-connect-char';
export const DASH_ATTRIBUTE = 'data-vivarcdi-connect-dash';
export const STATUS_ATTRIBUTE = 'data-vivarcdi-connect-status';
export const ACTIONS_ATTRIBUTE = 'data-vivarcdi-connect-actions';

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
  /** Shows a short confirmation to the user, such as the shared toast. */
  notify: (text: string, kind?: ToastKind) => void;
  timers?: ToastTimers;
}

export const TITLE = 'Connect GitHub';
export const HELP = 'Paste this code on GitHub to connect your live folders.';
export const WAITING = 'Waiting for GitHub…';
export const COPY_LABEL = 'Copy code and open GitHub';
export const CANCEL_LABEL = 'Cancel';
export const RETRY_LABEL = 'Try again';
export const COPIED_MESSAGE = 'Code copied, paste it on GitHub';
export const CANCELLED_MESSAGE = 'GitHub connection cancelled';

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
   * in boxes, one per character, under a `Connect GitHub` header, `Copy code and open GitHub`, and `Cancel`. It says `Waiting for GitHub…`
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
    const header = this.#header();
    switch (state.step) {
      case 'asking':
        return [header, this.#text('Asking GitHub for a code…'), this.#actions([this.#button(CANCEL_LABEL, () => this.#cancel())])];
      case 'code':
        return [header, this.#help(), this.#code(state.userCode), this.#status(WAITING), this.#actions([this.#button(COPY_LABEL, () => this.#copyAndOpen(state), true), this.#button(CANCEL_LABEL, () => this.#cancel())])];
      case 'connected':
        return [header, this.#text(state.login === '' ? 'Connected' : `Connected as ${state.login}`)];
      case 'failed':
        return [header, this.#text(state.message), this.#actions([this.#button(RETRY_LABEL, () => this.#start(), true), this.#button(CANCEL_LABEL, () => this.#cancel())])];
    }
  }

  #copyAndOpen({ userCode, verificationUri }: { userCode: string; verificationUri: string }): void {
    const open = (): void => this.#deps.openPage(verificationUri);
    this.#deps.copier.write(userCode).then(() => {
      this.#deps.notify(COPIED_MESSAGE, 'ok');
      open();
    }, open);
  }

  #cancel(): void {
    this.close();
    this.#deps.notify(CANCELLED_MESSAGE, 'neutral');
  }

  #header(): HTMLElement {
    const header = this.#text(TITLE);
    header.setAttribute(HEADER_ATTRIBUTE, '');
    return header;
  }

  #help(): HTMLElement {
    const help = this.#text(HELP);
    help.setAttribute(HELP_ATTRIBUTE, '');
    return help;
  }

  #status(text: string): HTMLElement {
    const status = this.#text(text);
    status.setAttribute(STATUS_ATTRIBUTE, '');
    return status;
  }

  #actions(buttons: HTMLElement[]): HTMLElement {
    const actions = this.#deps.document.createElement('div');
    actions.setAttribute(ACTIONS_ATTRIBUTE, '');
    actions.append(...buttons);
    return actions;
  }

  #code(userCode: string): HTMLElement {
    const code = this.#deps.document.createElement('div');
    code.setAttribute(CODE_ATTRIBUTE, '');
    code.append(
      ...[...userCode].map((character) => {
        const box = this.#deps.document.createElement('span');
        box.setAttribute(character === '-' ? DASH_ATTRIBUTE : CHAR_ATTRIBUTE, '');
        box.textContent = character === '-' ? '' : character;
        return box;
      }),
    );
    return code;
  }

  #text(text: string): HTMLElement {
    const element = this.#deps.document.createElement('div');
    element.textContent = text;
    return element;
  }

  #button(label: string, run: () => void, primary = false): HTMLElement {
    const button = this.#deps.document.createElement('button');
    button.setAttribute('type', 'button');
    button.textContent = label;
    button.toggleAttribute(PRIMARY_ATTRIBUTE, primary);
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
      this.#cancel();
    }
  }
}
