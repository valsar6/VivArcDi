"use strict";
var VivArcDiArchiveKeys = (() => {
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

  // src/page/archive-keys.ts
  var archive_keys_exports = {};
  __export(archive_keys_exports, {
    install: () => install,
    uninstall: () => uninstall
  });

  // src/core/dom/ShortcutKeys.ts
  var ShortcutKeys = class {
    /**
     * @param platform The value of `navigator.platform`.
     * @returns Whether it is macOS.
     */
    static isMac(platform) {
      return platform.toLowerCase().startsWith("mac");
    }
    /**
     * Tells whether a key press is Cmd/Ctrl+Shift and a letter, with no other modifier. Like the
     * other shortcuts of VivArcDi, Cmd and Ctrl are both accepted on every platform.
     *
     * @param event The key press.
     * @param letter The letter, such as `c`.
     * @returns Whether the press is that shortcut.
     */
    static isCommandShift(event, letter) {
      return (event.metaKey || event.ctrlKey) && event.shiftKey && !event.altKey && event.key.toLowerCase() === letter.toLowerCase();
    }
    /**
     * Tells whether a key press is Cmd+Option or Ctrl+Alt with a physical key, and no Shift. The
     * physical key is used because Option changes the character a letter produces on macOS.
     *
     * @param event The key press, with its `code`.
     * @param code The key code, such as `KeyN`.
     * @returns Whether the press is that shortcut.
     */
    static isCommandOption(event, code) {
      return (event.metaKey || event.ctrlKey) && event.altKey && !event.shiftKey && event.code === code;
    }
  };

  // src/modules/today/ArchiveMessage.ts
  var ARCHIVE_MESSAGE_TYPE = "vivarcdi-archive";
  var ARCHIVE_CONSOLE_PREFIX = "vivarcdi-archive:";

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

  // src/page/archive-keys.ts
  var INSTALL = new PageInstall("vivarcdi.archive.keys");
  function install(token) {
    INSTALL.replace(
      new PageListener("keydown", (event) => {
        const action = ShortcutKeys.isCommandShift(event, "a") ? "open" : ShortcutKeys.isCommandShift(event, "k") ? "clear" : null;
        if (!event.defaultPrevented && action !== null) {
          event.preventDefault();
          event.stopImmediatePropagation();
          sendToInterface({ type: ARCHIVE_MESSAGE_TYPE, token, action }, ARCHIVE_CONSOLE_PREFIX);
        }
      })
    );
  }
  function uninstall() {
    INSTALL.remove();
  }
  return __toCommonJS(archive_keys_exports);
})();
