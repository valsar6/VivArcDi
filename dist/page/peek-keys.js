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
    install: () => install
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
  function sendToInterface(message) {
    if (!sendThroughRuntime(message)) {
      console.debug(`${CONSOLE_PREFIX}${JSON.stringify(message)}`);
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

  // src/page/peek-keys.ts
  var INSTANCE_KEY = /* @__PURE__ */ Symbol.for("vivarcdi.peek.keys");
  function install(token) {
    const registry = globalThis;
    if (registry[INSTANCE_KEY]) {
      return;
    }
    registry[INSTANCE_KEY] = true;
    globalThis.addEventListener(
      "keydown",
      (event) => {
        const command = commandFor(event);
        if (command !== null) {
          event.preventDefault();
          event.stopImmediatePropagation();
          sendToInterface({ type: PEEK_MESSAGE_TYPE, token, action: "command", command });
        }
      },
      true
    );
  }
  return __toCommonJS(peek_keys_exports);
})();
