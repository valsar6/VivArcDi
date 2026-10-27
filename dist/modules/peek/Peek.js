import { DomQuery } from "../../core/DomQuery.js";
import { Module } from "../../core/Module.js";
import { LinkOpener } from "./LinkOpener.js";
import { PageScriptInjector } from "../../core/PageScriptInjector.js";
import { PageScripts } from "./PageScripts.js";
import { PeekController } from "./PeekController.js";
import { PeekKeys } from "./PeekKeys.js";
import { parsePeekMessage } from "./PeekMessage.js";
import { PeekPanel } from "./PeekPanel.js";
import { TabTiler } from "./TabTiler.js";
import { TAB_ID_ATTRIBUTE } from "../../core/Webview.js";
const OPEN_ATTRIBUTE = "data-vivarcdi-peek";
const MIN_PERCENT = 40;
const MAX_PERCENT = 100;
const WEB_URL = /^https?:\/\//i;
class Peek extends Module {
  static id = "peek";
  /**
   * Options accepted in `config.json`, with their defaults.
   */
  static defaults = Object.freeze({
    shiftClick: true,
    pinnedCrossSite: true,
    anyCrossSite: false,
    widthPercent: 80,
    heightPercent: 90
  });
  #token = "";
  #container = null;
  #controller = null;
  #injector = null;
  #keys = null;
  #unsubscribe = [];
  /**
   * Opens links in Peek, a floating panel over the current page that shows the real page:
   * on Shift+click, and on links that leave the site of a pinned tab.
   * Without `chrome.tabs` the module stays off and links behave as usual.
   *
   * @param context What the module may use.
   */
  async start(context) {
    if (!context.tabs.available) {
      context.logger.warn("chrome.tabs is missing: Peek is off");
      return;
    }
    const settings = Peek.settingsFrom(context.options);
    const container = DomQuery.require(context.document, context.selectors.get("webviewContainer"));
    const scripts = await PageScripts.load(context.payload);
    this.#token = crypto.randomUUID();
    this.#container = container;
    this.#controller = this.#createController(context, settings, scripts);
    this.#injector = this.#createInjector(context, settings, scripts);
    this.#keys = new PeekKeys(context.document, () => this.#controller?.isOpen ?? false, (command) => this.#run(command));
    this.#subscribe(context);
    this.#injector.attach();
    this.#keys.attach();
  }
  /**
   * Closes the Peek, removes the page scripts and every listener.
   */
  stop() {
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
    this.#keys?.detach();
    this.#injector?.detach();
    this.#controller?.close();
    this.#container?.removeAttribute(OPEN_ATTRIBUTE);
    this.#keys = null;
    this.#injector = null;
    this.#controller = null;
  }
  /**
   * Reads the options of `config.json`, keeping sizes within 40 to 100 percent.
   *
   * @param options The module's options.
   * @returns Complete settings.
   */
  static settingsFrom(options) {
    const settings = { ...Peek.defaults, ...options };
    const clamp = (value) => Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, Number(value) || MAX_PERCENT));
    return {
      shiftClick: settings.shiftClick === true,
      pinnedCrossSite: settings.pinnedCrossSite === true,
      anyCrossSite: settings.anyCrossSite === true,
      widthPercent: clamp(settings.widthPercent),
      heightPercent: clamp(settings.heightPercent)
    };
  }
  #createController({ document, tabs, runtime, logger }, size, scripts) {
    const container = this.#container;
    return new PeekController({
      createPanel: (request) => new PeekPanel(request.url, {
        document,
        container,
        size,
        partition: container.querySelector(`[${TAB_ID_ATTRIBUTE}="${request.tabId}"]`)?.getAttribute("partition") ?? null,
        scripts,
        token: this.#token,
        onCommand: (command) => this.#run(command),
        onConsoleMessage: (message) => this.#receive(message, request.tabId)
      }),
      opener: new LinkOpener(tabs, runtime),
      tiler: new TabTiler(tabs),
      logger,
      onChange: (open) => container.toggleAttribute(OPEN_ATTRIBUTE, open)
    });
  }
  #createInjector({ selectors, tabs, logger }, triggers, scripts) {
    const { shiftClick, pinnedCrossSite, anyCrossSite } = triggers;
    return new PageScriptInjector({
      container: this.#container,
      webviewSelector: selectors.get("tabWebview"),
      scriptFor: async (tabId) => scripts.installLinks({
        triggers: { shiftClick, pinnedCrossSite, anyCrossSite },
        pinned: (await tabs.get(tabId)).pinned,
        tabId,
        token: this.#token
      }),
      uninstallScript: scripts.uninstallLinks(),
      purpose: "Peek links",
      onConsoleMessage: (message, tabId) => this.#receive(message, tabId),
      logger
    });
  }
  #subscribe({ tabs, runtime, logger }) {
    if (runtime.messagesAvailable) {
      this.#unsubscribe.push(runtime.onMessage((message) => this.#receive(message, null)));
    }
    this.#unsubscribe.push(
      tabs.onUpdated((tabId, change) => {
        if (change.pinned !== void 0) {
          this.#injector?.refresh(tabId);
        }
      })
    );
    this.#subscribeToActivation(tabs, () => logger.warn("chrome.tabs.onActivated is missing: switching tab keeps the Peek"));
  }
  #subscribeToActivation(tabs, onMissing) {
    try {
      this.#unsubscribe.push(tabs.onActivated(() => this.#controller?.close()));
    } catch {
      onMissing();
    }
  }
  #receive(value, tabId) {
    const message = parsePeekMessage(value);
    if (message === null || message.token !== this.#token) {
      return;
    }
    if (message.action === "command") {
      this.#run(message.command);
    } else if (WEB_URL.test(message.url)) {
      this.#controller?.open({ url: message.url, tabId: tabId ?? message.tabId, disposition: message.disposition });
    }
  }
  #run(command) {
    if (command === "close") {
      this.#controller?.close();
    } else if (command === "expand") {
      void this.#controller?.expand();
    } else {
      void this.#controller?.split();
    }
  }
}
export {
  OPEN_ATTRIBUTE,
  Peek
};
