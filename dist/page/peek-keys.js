"use strict";
var VivArcDiPeekKeys = (() => {
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

  // src/page/peek-keys.ts
  var peek_keys_exports = {};
  __export(peek_keys_exports, {
    install: () => install,
    uninstall: () => uninstall
  });

  // src/modules/peek/PeekKeyMap.ts
  function commandFor(event) {
    const key = event.key.toLowerCase();
    if (key === "escape") {
      return "close";
    }
    if (!event.metaKey && !event.ctrlKey) {
      return null;
    }
    if (key === "w") {
      return "close";
    }
    return key === "o" ? "expand" : null;
  }

  // src/modules/peek/PeekMessage.ts
  var PEEK_MESSAGE_TYPE = "vivarcdi-peek";
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

  // src/page/lib/PageInstall.ts
  var PageListener = class {
    #type;
    #listener;
    constructor(type, listener) {
      this.#type = type;
      this.#listener = listener;
    }
    attach() {
      globalThis.addEventListener(this.#type, this.#listener, true);
    }
    detach() {
      globalThis.removeEventListener(this.#type, this.#listener, true);
    }
  };
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

  // src/page/peek-keys.ts
  var INSTALL = new PageInstall("vivarcdi.peek.keys");
  function install(token) {
    INSTALL.replace(
      new PageListener("keydown", (event) => {
        const command = commandFor(event);
        if (command !== null) {
          event.preventDefault();
          event.stopImmediatePropagation();
          sendToInterface({ type: PEEK_MESSAGE_TYPE, token, action: "command", command });
        }
      })
    );
  }
  function uninstall() {
    INSTALL.remove();
  }
  return __toCommonJS(peek_keys_exports);
})();
