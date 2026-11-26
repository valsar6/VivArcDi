import { PageScriptInjector } from "../../core/browser/PageScriptInjector.js";
import { ShortcutKeys } from "../../core/dom/ShortcutKeys.js";
import { parseArchiveMessage } from "./ArchiveMessage.js";
const KEYS_PATH = "page/archive-keys.js";
const KEYS_GLOBAL = "VivArcDiArchiveKeys";
const OPEN_LETTER = "a";
const CLEAR_LETTER = "k";
class ArchiveKeys {
  #context;
  #actions;
  #token = crypto.randomUUID();
  #injector = null;
  #unsubscribe = [];
  #onKey = (event) => this.#handleKey(event);
  /**
   * Catches Cmd/Ctrl+Shift+A and Cmd/Ctrl+Shift+K in the interface, in the capture phase, and in every tab's page
   * through an injected script that forwards it with a token.
   *
   * @param context The context of the today-archive module.
   * @param actions What each shortcut does.
   */
  constructor(context, actions) {
    this.#context = context;
    this.#actions = actions;
  }
  /**
   * Starts catching the shortcut. Without page scripts it still works while the interface has
   * the focus.
   */
  async start() {
    this.#context.document.addEventListener("keydown", this.#onKey, true);
    try {
      await this.#startPageScript();
    } catch (error) {
      this.#context.logger.warn("Cmd/Ctrl+Shift+A and Cmd/Ctrl+Shift+K work only while the interface has the focus", error);
    }
  }
  /**
   * Stops catching and removes the page script.
   */
  stop() {
    this.#context.document.removeEventListener("keydown", this.#onKey, true);
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
    this.#injector?.detach();
    this.#injector = null;
  }
  async #startPageScript() {
    const { document, selectors, runtime, payload, logger } = this.#context;
    const script = await payload.text(KEYS_PATH);
    const install = `${script}
${KEYS_GLOBAL}.install(${JSON.stringify(this.#token)});`;
    this.#injector = new PageScriptInjector({
      container: document.querySelector(selectors.get("webviewContainer")) ?? document.body,
      webviewSelector: selectors.get("tabWebview"),
      scriptFor: () => Promise.resolve(install),
      uninstallScript: `globalThis.${KEYS_GLOBAL}?.uninstall();`,
      purpose: "archive shortcuts",
      onConsoleMessage: (message) => this.#receive(message),
      errors: runtime,
      logger
    });
    if (runtime.messagesAvailable) {
      this.#unsubscribe.push(runtime.onMessage((message) => this.#receive(message)));
    }
    this.#injector.attach();
  }
  #handleKey(event) {
    if (event.defaultPrevented) {
      return;
    }
    const action = ShortcutKeys.isCommandShift(event, OPEN_LETTER) ? this.#actions.open : ShortcutKeys.isCommandShift(event, CLEAR_LETTER) ? this.#actions.clear : null;
    if (action !== null) {
      event.preventDefault();
      event.stopImmediatePropagation();
      action();
    }
  }
  #receive(value) {
    const message = parseArchiveMessage(value);
    if (message?.token === this.#token) {
      this.#actions[message.action]();
    }
  }
}
export {
  ArchiveKeys
};
