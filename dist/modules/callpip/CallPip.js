import { Module } from "../../core/boot/Module.js";
import { PageScriptInjector } from "../../core/browser/PageScriptInjector.js";
import { parseCallMessage } from "./CallMessage.js";
import { CALL_PIP_OPTIONS } from "./CallPipOptions.js";
import { siteFor } from "./CallSites.js";
const SCRIPT_PATH = "page/call-pip.js";
const SCRIPT_GLOBAL = "VivArcDiCallPip";
const OPEN_COMMAND = `${SCRIPT_GLOBAL}?.open();`;
const CLOSE_COMMAND = `${SCRIPT_GLOBAL}?.close();`;
class CallPip extends Module {
  static id = "call-pip";
  static privateWindows = "never";
  static options = CALL_PIP_OPTIONS;
  #context = null;
  #token = "";
  #injector = null;
  #unsubscribe = [];
  #active = /* @__PURE__ */ new Map();
  /**
   * Injects the page script into the pages of the enabled call sites. The script floats the call in
   * Picture in Picture when the user presses the shortcut. When the active tab changes, the module asks
   * the tab that was left to open the window, which the browser honors after a recent interaction with
   * the page, and the tab shown to close its own. Without `chrome.tabs` the module stays off.
   *
   * @param context What the module may use.
   */
  async start(context) {
    const { document, selectors, tabs, runtime, payload, logger } = context;
    if (!tabs.available) {
      logger.warn("chrome.tabs is missing: the call Picture in Picture is off");
      return;
    }
    this.#context = context;
    this.#token = crypto.randomUUID();
    const script = await payload.text(SCRIPT_PATH);
    this.#injector = new PageScriptInjector({
      container: document.querySelector(selectors.get("webviewContainer")) ?? document.body,
      webviewSelector: selectors.get("tabWebview"),
      scriptFor: (tabId) => this.#scriptFor(script, tabId),
      uninstallScript: `globalThis.${SCRIPT_GLOBAL}?.uninstall();`,
      purpose: "call Picture in Picture",
      onConsoleMessage: (message) => this.#receive(message),
      errors: runtime,
      logger
    });
    if (runtime.messagesAvailable) {
      this.#unsubscribe.push(runtime.onMessage((message) => this.#receive(message)));
    }
    this.#injector.attach();
    await this.#followActiveTabs(context);
  }
  /**
   * Removes the page script from every page and every listener.
   */
  stop() {
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
    this.#injector?.detach();
    this.#injector = null;
    this.#active.clear();
    this.#context = null;
  }
  async #followActiveTabs({ tabs }) {
    this.#unsubscribe.push(tabs.onActivated((info) => this.#onActivated(info)));
    const active = await tabs.query({ active: true });
    active.forEach(({ id, windowId }) => id !== void 0 && !this.#active.has(windowId) && this.#active.set(windowId, id));
  }
  #onActivated({ tabId, windowId }) {
    const previous = this.#active.get(windowId);
    this.#active.set(windowId, tabId);
    if (previous !== void 0 && previous !== tabId && this.#context?.options.openOnTabSwitch === true) {
      this.#injector?.run(previous, `globalThis.${OPEN_COMMAND}`);
    }
    this.#injector?.run(tabId, `globalThis.${CLOSE_COMMAND}`);
  }
  async #scriptFor(script, tabId) {
    const context = this.#context;
    if (context === null) {
      return null;
    }
    const tab = await context.tabs.get(tabId);
    const found = siteFor(tab.url, context.options, context.selectors);
    if (found === null) {
      return null;
    }
    const policy = {
      token: this.#token,
      tabId,
      letter: context.options.shortcutLetter,
      inCallSelector: found.inCallSelector
    };
    return `${script}
${SCRIPT_GLOBAL}.install(${JSON.stringify(policy)});`;
  }
  #receive(value) {
    const message = parseCallMessage(value);
    if (message?.token === this.#token) {
      this.#context?.logger.warn(`The call page of tab ${message.tabId} reported: ${message.reason}`);
    }
  }
}
export {
  CallPip
};
