import { PageScriptInjector } from "../../core/PageScriptInjector.js";
import { TabUnloader } from "../../core/TabUnloader.js";
import { ActiveTab } from "./ActiveTab.js";
import { CloseShortcut } from "./CloseShortcut.js";
import { parsePinnedMessage } from "./PinnedMessage.js";
const KEYS_PATH = "page/pinned-keys.js";
const KEYS_GLOBAL = "VivArcDiPinnedKeys";
class PinnedClosing {
  #context;
  #token = crypto.randomUUID();
  #unloader;
  #active;
  #shortcut = null;
  #injector = null;
  #unsubscribe = [];
  /**
   * Unloads Favorites and pinned tabs on Cmd/Ctrl+W and on their close button, whether the focus
   * is in the interface or in the page.
   *
   * @param context The context of the pinned-tabs module.
   */
  constructor(context) {
    this.#context = context;
    this.#unloader = new TabUnloader(context.tabs);
    this.#active = new ActiveTab(context.tabs, (error) => context.logger.error("Could not read the active tab", error));
  }
  /**
   * Starts catching the shortcut and the close button.
   */
  async start() {
    const { document, selectors } = this.#context;
    await this.#active.start();
    this.#shortcut = new CloseShortcut({
      document,
      closeSelector: selectors.get("tabClose"),
      pinnedSelector: selectors.get("pinnedTab"),
      wrapperSelector: selectors.get("tabWrapper"),
      activePinned: () => this.#active.pinnedId,
      unload: (tabId) => this.#unload(tabId)
    });
    this.#shortcut.attach();
    await this.#startPageScript();
  }
  /**
   * Stops catching and removes the page script.
   */
  stop() {
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
    this.#shortcut?.detach();
    this.#injector?.detach();
    this.#active.stop();
    this.#shortcut = null;
    this.#injector = null;
  }
  async #startPageScript() {
    const { document, selectors, tabs, runtime, payload, logger } = this.#context;
    const script = await payload.text(KEYS_PATH);
    this.#injector = new PageScriptInjector({
      container: document.querySelector(selectors.get("webviewContainer")) ?? document.body,
      webviewSelector: selectors.get("tabWebview"),
      scriptFor: async (tabId) => (await tabs.get(tabId)).pinned ? `${script}
${KEYS_GLOBAL}.install(${JSON.stringify({ token: this.#token, tabId })});` : null,
      uninstallScript: `globalThis.${KEYS_GLOBAL}?.uninstall();`,
      purpose: "pinned tab shortcuts",
      onConsoleMessage: (message) => this.#receive(message),
      logger
    });
    if (runtime.messagesAvailable) {
      this.#unsubscribe.push(runtime.onMessage((message) => this.#receive(message)));
    }
    this.#unsubscribe.push(
      tabs.onUpdated((tabId, change) => {
        if (change.pinned !== void 0) {
          this.#injector?.refresh(tabId);
        }
      })
    );
    this.#injector.attach();
  }
  #receive(value) {
    const message = parsePinnedMessage(value);
    if (message?.token === this.#token) {
      void this.#unloadIfPinned(message.tabId);
    }
  }
  async #unloadIfPinned(tabId) {
    if ((await this.#context.tabs.get(tabId)).pinned) {
      this.#unload(tabId);
    }
  }
  #unload(tabId) {
    this.#unloader.unload(tabId).catch((error) => this.#context.logger.error(`Could not unload tab ${tabId}`, error));
  }
}
export {
  PinnedClosing
};
