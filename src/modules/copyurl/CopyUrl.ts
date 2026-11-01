import { Module } from '../../core/Module.js';
import type { ModuleContext, PrivateWindowPolicy } from '../../core/Module.js';
import { PageScriptInjector } from '../../core/PageScriptInjector.js';
import { ShortcutKeys } from '../../core/ShortcutKeys.js';
import { Toast } from '../../core/Toast.js';
import { parseCopyMessage } from './CopyMessage.js';
import { UrlCopier } from './UrlCopier.js';

export interface CopyUrlSettings {
  /** How long the confirmation stays, in milliseconds. */
  toastMs: number;
}

export const COPIED_TEXT = 'Copied';
export const FAILED_TEXT = 'Copy failed';

const KEYS_PATH = 'page/copy-keys.js';
const KEYS_GLOBAL = 'VivArcDiCopyKeys';
const SHORTCUT_LETTER = 'c';
const MIN_TOAST_MS = 500;
const MAX_TOAST_MS = 10000;

export class CopyUrl extends Module {
  public static override id = 'copy-url';
  public static override privateWindows: PrivateWindowPolicy = 'allowed';

  /**
   * Options accepted in `config.json`, with their defaults.
   */
  public static readonly defaults: Readonly<CopyUrlSettings> = Object.freeze({ toastMs: 2000 });

  #context: ModuleContext | null = null;
  #token = '';
  #copier: UrlCopier | null = null;
  #toast: Toast | null = null;
  #injector: PageScriptInjector | null = null;
  #unsubscribe: Array<() => void> = [];
  #onKey = (event: Event): void => this.#handleKey(event as KeyboardEvent);

  /**
   * Copies the address of the active tab on Cmd/Ctrl+Shift+C, whether the focus is in the
   * interface or in the page, and confirms it with a toast at the bottom of the window.
   * Without `chrome.tabs` the module stays off.
   *
   * @param context What the module may use.
   */
  public override async start(context: ModuleContext): Promise<void> {
    const { document, selectors, tabs, logger, options } = context;
    if (!tabs.available) {
      logger.warn('chrome.tabs is missing: copying the address is off');
      return;
    }
    this.#context = context;
    this.#token = crypto.randomUUID();
    this.#copier = UrlCopier.for(tabs, document, document.defaultView?.navigator.clipboard);
    this.#toast = new Toast({
      document,
      parent: document.querySelector(selectors.get('browser')) ?? document.body,
      durationMs: CopyUrl.settingsFrom(options).toastMs,
    });
    document.addEventListener('keydown', this.#onKey, true);
    await this.#startPageScript(context);
  }

  /**
   * Removes the toast, the page script and every listener.
   */
  public override stop(): void {
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
    this.#context?.document.removeEventListener('keydown', this.#onKey, true);
    this.#injector?.detach();
    this.#toast?.remove();
    this.#injector = null;
    this.#toast = null;
    this.#copier = null;
    this.#context = null;
  }

  /**
   * Reads the options of `config.json`, keeping the toast between half a second and ten seconds.
   *
   * @param options The module's options.
   * @returns Complete settings.
   */
  public static settingsFrom(options: Record<string, unknown>): CopyUrlSettings {
    const toastMs = Number(options['toastMs'] ?? CopyUrl.defaults.toastMs) || CopyUrl.defaults.toastMs;
    return { toastMs: Math.min(MAX_TOAST_MS, Math.max(MIN_TOAST_MS, toastMs)) };
  }

  async #startPageScript({ document, selectors, runtime, payload, logger }: ModuleContext): Promise<void> {
    const script = await payload.text(KEYS_PATH);
    this.#injector = new PageScriptInjector({
      container: document.querySelector(selectors.get('webviewContainer')) ?? document.body,
      webviewSelector: selectors.get('tabWebview'),
      scriptFor: (tabId): Promise<string> =>
        Promise.resolve(`${script}\n${KEYS_GLOBAL}.install(${JSON.stringify({ token: this.#token, tabId })});`),
      uninstallScript: `globalThis.${KEYS_GLOBAL}?.uninstall();`,
      purpose: 'copy address shortcuts',
      onConsoleMessage: (message): void => this.#receive(message),
      logger,
    });
    if (runtime.messagesAvailable) {
      this.#unsubscribe.push(runtime.onMessage((message) => this.#receive(message)));
    }
    this.#injector.attach();
  }

  #handleKey(event: KeyboardEvent): void {
    if (!event.defaultPrevented && ShortcutKeys.isCommandShift(event, SHORTCUT_LETTER)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.#copy();
    }
  }

  #receive(value: unknown): void {
    if (parseCopyMessage(value)?.token === this.#token) {
      this.#copy();
    }
  }

  #copy(): void {
    const copier = this.#copier;
    if (copier === null) {
      return;
    }
    copier.copyActive().then(
      () => this.#toast?.show(COPIED_TEXT),
      (error: unknown) => {
        this.#context?.logger.error('Could not copy the address of the active tab', error);
        this.#toast?.show(FAILED_TEXT);
      },
    );
  }
}
