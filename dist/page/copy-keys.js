"use strict";
var VivArcDiCopyKeys = (() => {
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

  // src/page/copy-keys.ts
  var copy_keys_exports = {};
  __export(copy_keys_exports, {
    install: () => install,
    uninstall: () => uninstall
  });

  // src/core/ShortcutKeys.ts
  var ShortcutKeys = class {
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
  };

  // src/modules/copyurl/CopyMessage.ts
  var COPY_MESSAGE_TYPE = "vivarcdi-copy";
  var COPY_CONSOLE_PREFIX = "vivarcdi-copy:";

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

  // src/page/copy-keys.ts
  var INSTANCE_KEY = /* @__PURE__ */ Symbol.for("vivarcdi.copy.keys");
  var SHORTCUT_LETTER = "c";
  function install({ token, tabId }) {
    uninstall();
    const listener = (event) => {
      if (!event.defaultPrevented && ShortcutKeys.isCommandShift(event, SHORTCUT_LETTER)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        sendToInterface({ type: COPY_MESSAGE_TYPE, token, tabId, action: "copy" }, COPY_CONSOLE_PREFIX);
      }
    };
    globalThis.addEventListener("keydown", listener, true);
    globalThis[INSTANCE_KEY] = listener;
  }
  function uninstall() {
    const registry = globalThis;
    const listener = registry[INSTANCE_KEY];
    if (listener !== void 0) {
      globalThis.removeEventListener("keydown", listener, true);
    }
    registry[INSTANCE_KEY] = void 0;
  }
  return __toCommonJS(copy_keys_exports);
})();
