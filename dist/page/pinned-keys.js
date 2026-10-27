"use strict";
var VivArcDiPinnedKeys = (() => {
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

  // src/page/pinned-keys.ts
  var pinned_keys_exports = {};
  __export(pinned_keys_exports, {
    install: () => install,
    uninstall: () => uninstall
  });

  // src/core/TabSlot.ts
  var TAB_ID = /^tab-(\d+)$/;
  var TabSlot = class {
    /**
     * Reads the tab id of a slot of Vivaldi's tab strip, or of an element inside one.
     *
     * @param slot A slot, a tab wrapper, or an element inside a slot.
     * @param wrapperSelector Selector of Vivaldi's tab wrapper, which carries `data-id="tab-<id>"`.
     * @returns The tab id, or null.
     */
    static idOf(slot, wrapperSelector) {
      const wrapper = slot.closest(wrapperSelector) ?? slot.querySelector(wrapperSelector);
      const match = TAB_ID.exec(wrapper?.dataset["id"] ?? "");
      return match?.[1] === void 0 ? null : Number(match[1]);
    }
  };

  // src/modules/pinned/CloseShortcut.ts
  var CloseShortcut = class _CloseShortcut {
    #deps;
    #onKey = (event) => this.#handleKey(event);
    #onClick = (event) => this.#handleClick(event);
    /**
     * Makes Cmd/Ctrl+W and the close button unload Favorites and pinned tabs instead of closing
     * them. Ordinary tabs are left to Vivaldi, and so is a shortcut another module already took.
     *
     * @param dependencies Everything it collaborates with.
     */
    constructor(dependencies) {
      this.#deps = dependencies;
    }
    /**
     * @param event A key press.
     * @returns Whether it is Cmd/Ctrl+W without other modifiers.
     */
    static isCloseKey(event) {
      return (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "w";
    }
    /**
     * Starts listening, in the capture phase.
     */
    attach() {
      this.#deps.document.addEventListener("keydown", this.#onKey, true);
      this.#deps.document.addEventListener("click", this.#onClick, true);
    }
    /**
     * Stops listening.
     */
    detach() {
      this.#deps.document.removeEventListener("keydown", this.#onKey, true);
      this.#deps.document.removeEventListener("click", this.#onClick, true);
    }
    #handleKey(event) {
      const tabId = event.defaultPrevented || !_CloseShortcut.isCloseKey(event) ? null : this.#deps.activePinned();
      if (tabId !== null) {
        _CloseShortcut.#take(event);
        this.#deps.unload(tabId);
      }
    }
    #handleClick(event) {
      const button = event.target?.closest?.(this.#deps.closeSelector) ?? null;
      if (button?.closest(this.#deps.pinnedSelector) == null) {
        return;
      }
      const tabId = TabSlot.idOf(button, this.#deps.wrapperSelector);
      if (tabId !== null) {
        _CloseShortcut.#take(event);
        this.#deps.unload(tabId);
      }
    }
    static #take(event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  // src/modules/pinned/PinnedMessage.ts
  var PINNED_MESSAGE_TYPE = "vivarcdi-pinned";
  var PINNED_CONSOLE_PREFIX = "vivarcdi-pinned:";

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

  // src/page/pinned-keys.ts
  var INSTANCE_KEY = /* @__PURE__ */ Symbol.for("vivarcdi.pinned.keys");
  function install({ token, tabId }) {
    uninstall();
    const listener = (event) => {
      if (!event.defaultPrevented && CloseShortcut.isCloseKey(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        sendToInterface({ type: PINNED_MESSAGE_TYPE, token, tabId, action: "close" }, PINNED_CONSOLE_PREFIX);
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
  return __toCommonJS(pinned_keys_exports);
})();
