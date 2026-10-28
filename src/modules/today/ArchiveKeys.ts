import type { ModuleContext } from '../../core/Module.js';
import { PageScriptInjector } from '../../core/PageScriptInjector.js';
import { ShortcutKeys } from '../../core/ShortcutKeys.js';
import { parseArchiveMessage } from './ArchiveMessage.js';

const KEYS_PATH = 'page/archive-keys.js';
const KEYS_GLOBAL = 'VivArcDiArchiveKeys';
const LETTER = 'a';

export type ArchiveKeysContext = Pick<ModuleContext, 'document' | 'selectors' | 'runtime' | 'payload' | 'logger'>;

export class ArchiveKeys {
  #context: ArchiveKeysContext;
  #onPress: () => void;
  #token = crypto.randomUUID();
  #injector: PageScriptInjector | null = null;
  #unsubscribe: Array<() => void> = [];
  #onKey = (event: Event): void => this.#handleKey(event as KeyboardEvent);

  /**
   * Catches Cmd/Ctrl+Shift+A in the interface, in the capture phase, and in every tab's page
   * through an injected script that forwards it with a token.
   *
   * @param context The context of the today-archive module.
   * @param onPress What the shortcut does.
   */
  constructor(context: ArchiveKeysContext, onPress: () => void) {
    this.#context = context;
    this.#onPress = onPress;
  }

  /**
   * Starts catching the shortcut. Without page scripts it still works while the interface has
   * the focus.
   */
  public async start(): Promise<void> {
    this.#context.document.addEventListener('keydown', this.#onKey, true);
    try {
      await this.#startPageScript();
    } catch (error) {
      this.#context.logger.warn('Cmd/Ctrl+Shift+A works only while the interface has the focus', error);
    }
  }

  /**
   * Stops catching and removes the page script.
   */
  public stop(): void {
    this.#context.document.removeEventListener('keydown', this.#onKey, true);
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
    this.#injector?.detach();
    this.#injector = null;
  }

  async #startPageScript(): Promise<void> {
    const { document, selectors, runtime, payload, logger } = this.#context;
    const script = await payload.text(KEYS_PATH);
    const install = `${script}\n${KEYS_GLOBAL}.install(${JSON.stringify(this.#token)});`;
    this.#injector = new PageScriptInjector({
      container: document.querySelector(selectors.get('webviewContainer')) ?? document.body,
      webviewSelector: selectors.get('tabWebview'),
      scriptFor: (): Promise<string> => Promise.resolve(install),
      uninstallScript: `globalThis.${KEYS_GLOBAL}?.uninstall();`,
      purpose: 'archive shortcuts',
      onConsoleMessage: (message): void => this.#receive(message),
      logger,
    });
    if (runtime.messagesAvailable) {
      this.#unsubscribe.push(runtime.onMessage((message) => this.#receive(message)));
    }
    this.#injector.attach();
  }

  #handleKey(event: KeyboardEvent): void {
    if (!event.defaultPrevented && ShortcutKeys.isCommandShift(event, LETTER)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.#onPress();
    }
  }

  #receive(value: unknown): void {
    if (parseArchiveMessage(value)?.token === this.#token) {
      this.#onPress();
    }
  }
}
