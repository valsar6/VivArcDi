import { Module } from '../../core/boot/Module.js';
import type { ModuleContext, PrivateWindowPolicy } from '../../core/boot/Module.js';
import { PageScriptInjector } from '../../core/browser/PageScriptInjector.js';
import { parseCallMessage } from './CallMessage.js';
import type { CallPagePolicy } from './CallMessage.js';
import { CALL_PIP_OPTIONS } from './CallPipOptions.js';
import type { CallPipOptions } from './CallPipOptions.js';
import { siteFor } from './CallSites.js';

const SCRIPT_PATH = 'page/call-pip.js';
const SCRIPT_GLOBAL = 'VivArcDiCallPip';

export class CallPip extends Module<CallPipOptions> {
  public static override id = 'call-pip';
  public static override privateWindows: PrivateWindowPolicy = 'never';

  public static override options = CALL_PIP_OPTIONS;

  #context: ModuleContext<CallPipOptions> | null = null;
  #token = '';
  #injector: PageScriptInjector | null = null;
  #unsubscribe: Array<() => void> = [];

  /**
   * Injects the page script into the pages of the enabled call sites. The script floats the call in
   * Picture in Picture when the user presses the shortcut. Without `chrome.tabs` the module stays off.
   *
   * @param context What the module may use.
   */
  public override async start(context: ModuleContext<CallPipOptions>): Promise<void> {
    const { document, selectors, tabs, runtime, payload, logger } = context;
    if (!tabs.available) {
      logger.warn('chrome.tabs is missing: the call Picture in Picture is off');
      return;
    }
    this.#context = context;
    this.#token = crypto.randomUUID();
    const script = await payload.text(SCRIPT_PATH);
    this.#injector = new PageScriptInjector({
      container: document.querySelector(selectors.get('webviewContainer')) ?? document.body,
      webviewSelector: selectors.get('tabWebview'),
      scriptFor: (tabId): Promise<string | null> => this.#scriptFor(script, tabId),
      uninstallScript: `globalThis.${SCRIPT_GLOBAL}?.uninstall();`,
      purpose: 'call Picture in Picture',
      onConsoleMessage: (message): void => this.#receive(message),
      errors: runtime,
      logger,
    });
    if (runtime.messagesAvailable) {
      this.#unsubscribe.push(runtime.onMessage((message) => this.#receive(message)));
    }
    this.#injector.attach();
  }

  /**
   * Removes the page script from every page and every listener.
   */
  public override stop(): void {
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
    this.#injector?.detach();
    this.#injector = null;
    this.#context = null;
  }

  async #scriptFor(script: string, tabId: number): Promise<string | null> {
    const context = this.#context;
    if (context === null) {
      return null;
    }
    const tab = await context.tabs.get(tabId);
    const found = siteFor(tab.url, context.options, context.selectors);
    if (found === null) {
      return null;
    }
    const policy: CallPagePolicy = {
      token: this.#token,
      tabId,
      letter: context.options.shortcutLetter,
      inCallSelector: found.inCallSelector,
    };
    return `${script}\n${SCRIPT_GLOBAL}.install(${JSON.stringify(policy)});`;
  }

  #receive(value: unknown): void {
    const message = parseCallMessage(value);
    if (message?.token === this.#token) {
      this.#context?.logger.warn(`The call page of tab ${message.tabId} reported: ${message.reason}`);
    }
  }
}
