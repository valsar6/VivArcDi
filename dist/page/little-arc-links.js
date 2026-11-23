"use strict";
var VivArcDiLittleArcLinks = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/page/little-arc-links.ts
  var little_arc_links_exports = {};
  __export(little_arc_links_exports, {
    install: () => install,
    uninstall: () => uninstall
  });

  // src/modules/littlearc/LittleArcMessage.ts
  var LITTLE_ARC_MESSAGE_TYPE = "vivarcdi-little-arc";
  var LITTLE_ARC_CONSOLE_PREFIX = "vivarcdi-little-arc:";

  // src/page/lib/PageInstall.ts
  var PageInstall = class {
    #key;
    constructor(key) {
      this.#key = Symbol.for(key);
    }
    /**
     * Detaches the previous hook, attaches the new one and keeps it.
     *
     * @param hook What to attach to the page.
     */
    replace(hook) {
      this.remove();
      hook.attach();
      this.#slot()[this.#key] = hook;
    }
    /**
     * Detaches the kept hook, if any, and forgets it.
     */
    remove() {
      const slot = this.#slot();
      const hook = slot[this.#key];
      if (typeof hook?.detach === "function") {
        hook.detach();
      }
      slot[this.#key] = void 0;
    }
    #slot() {
      return globalThis;
    }
  };

  // src/modules/peek/PeekMessage.ts
  var CONSOLE_PREFIX = "vivarcdi-peek:";

  // src/page/lib/PageChannel.ts
  function sendToInterface(message, consolePrefix = CONSOLE_PREFIX) {
    if (!sendThroughRuntime(message)) {
      console.debug(`${consolePrefix}${JSON.stringify(message)}`);
    }
  }
  function sendThroughRuntime(message) {
    const scope = globalThis;
    const runtime = scope.chrome?.runtime;
    if (runtime?.sendMessage === void 0) {
      return false;
    }
    try {
      runtime.sendMessage(message);
      return true;
    } catch {
      return false;
    }
  }

  // src/page/little-arc-links.ts
  var INSTALL = new PageInstall("vivarcdi.little-arc.links");
  var MAIN_BUTTON = 0;
  var WEB_URL = /^https?:\/\//i;
  var LittleArcLinkListener = class {
    #policy;
    #listener = (event) => this.#handle(event);
    constructor(policy) {
      this.#policy = policy;
    }
    attach() {
      globalThis.addEventListener("click", this.#listener, true);
    }
    detach() {
      globalThis.removeEventListener("click", this.#listener, true);
    }
    #handle(event) {
      if (!this.#isPlainLeftClick(event) || event.defaultPrevented) {
        return;
      }
      const anchor = event.composedPath().find((node) => node instanceof HTMLAnchorElement);
      if (anchor === void 0 || anchor.target.toLowerCase() !== "_blank" || !WEB_URL.test(anchor.href)) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      const { tabId, token } = this.#policy;
      sendToInterface({ type: LITTLE_ARC_MESSAGE_TYPE, action: "page-link", token, tabId, url: anchor.href }, LITTLE_ARC_CONSOLE_PREFIX);
    }
    #isPlainLeftClick(event) {
      return event.button === MAIN_BUTTON && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey;
    }
  };
  function install(policy) {
    INSTALL.replace(new LittleArcLinkListener(policy));
  }
  function uninstall() {
    INSTALL.remove();
  }
  return __toCommonJS(little_arc_links_exports);
})();
