import { Module } from "../../core/boot/Module.js";
import { PageScriptInjector } from "../../core/browser/PageScriptInjector.js";
import { parseCallMessage } from "./CallMessage.js";
import { CALL_PIP_OPTIONS } from "./CallPipOptions.js";
import { siteFor } from "./CallSites.js";
const SCRIPT_PATH = "page/call-pip.js";
const SCRIPT_GLOBAL = "VivArcDiCallPip";
class CallPip extends Module {
  static id = "call-pip";
  static privateWindows = "never";
  static options = CALL_PIP_OPTIONS;
  #context = null;
  #token = "";
  #injector = null;
  #unsubscribe = [];
  /**
   * Injects the page script into the pages of the enabled call sites. The script floats the call in
   * Picture in Picture when the user presses the shortcut. Without `chrome.tabs` the module stays off.
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
  }
  /**
   * Removes the page script from every page and every listener.
   */
  stop() {
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
    this.#injector?.detach();
    this.#injector = null;
    this.#context = null;
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
