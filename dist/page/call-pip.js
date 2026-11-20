"use strict";
var VivArcDiCallPip = (() => {
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

  // src/page/call-pip.ts
  var call_pip_exports = {};
  __export(call_pip_exports, {
    install: () => install,
    uninstall: () => uninstall
  });

  // src/modules/callpip/CallMessage.ts
  var CALL_MESSAGE_TYPE = "vivarcdi-call-pip";
  var CALL_CONSOLE_PREFIX = "vivarcdi-call-pip:";

  // src/core/dom/ShortcutKeys.ts
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

  // src/page/lib/CallVideo.ts
  function hasLiveTrack(video) {
    const stream = video.srcObject;
    return stream?.getVideoTracks?.().some((track) => track.readyState === "live") ?? false;
  }
  function areaOf(video) {
    if (video.paused || video.ended || !hasLiveTrack(video)) {
      return 0;
    }
    const { width, height } = video.getBoundingClientRect();
    return width * height;
  }
  var CallVideo = class {
    /**
     * @param root The document of a call page.
     * @returns The largest video that is playing a live video track, or null when there is none.
     */
    static pick(root) {
      let best = null;
      let bestArea = 0;
      for (const video of Array.from(root.querySelectorAll("video"))) {
        const area = areaOf(video);
        if (area > bestArea) {
          best = video;
          bestArea = area;
        }
      }
      return best;
    }
  };

  // src/page/lib/CallDetector.ts
  var POLL_MS = 1e3;
  var CallDetector = class {
    #root;
    #selector;
    #onChange;
    #timer = null;
    #active = false;
    /**
     * Follows whether a page shows a call in progress: the site's in-call view is there and a video
     * plays a live track.
     *
     * @param root The document of the page.
     * @param selector Selector that matches only while the page shows a call.
     * @param onChange Called with the new state each time it changes.
     */
    constructor(root, selector, onChange) {
      this.#root = root;
      this.#selector = selector;
      this.#onChange = onChange;
    }
    /**
     * @returns Whether a call is in progress now.
     */
    inCall() {
      return this.#root.querySelector(this.#selector) !== null && CallVideo.pick(this.#root) !== null;
    }
    /**
     * Starts checking once a second.
     */
    start() {
      this.check();
      this.#timer = setInterval(() => this.check(), POLL_MS);
    }
    /**
     * Stops checking.
     */
    stop() {
      if (this.#timer !== null) {
        clearInterval(this.#timer);
      }
      this.#timer = null;
    }
    /**
     * Compares the page with the last state and reports a change.
     */
    check() {
      const now = this.inCall();
      if (now !== this.#active) {
        this.#active = now;
        this.#onChange(now);
      }
    }
  };

  // src/page/lib/CallPipHook.ts
  var CallPipHook = class {
    #policy;
    #document;
    #warn;
    #detector;
    #warned = false;
    /**
     * Floats the call of a page in Picture in Picture on Cmd/Ctrl+Shift and a letter, and closes the
     * window when the tab is shown again or the call ends.
     *
     * @param policy The letter, the selector of the in-call view and the identity of the page.
     * @param document The document of the call page.
     * @param warn Tells the interface that something on the page is not as expected.
     */
    constructor(policy, document2, warn) {
      this.#policy = policy;
      this.#document = document2;
      this.#warn = warn;
      this.#detector = new CallDetector(document2, policy.inCallSelector, (inCall) => this.#onCall(inCall));
    }
    attach() {
      globalThis.addEventListener("keydown", this.#onKey, true);
      this.#document.addEventListener("visibilitychange", this.#onVisibility);
      this.#detector.start();
    }
    detach() {
      globalThis.removeEventListener("keydown", this.#onKey, true);
      this.#document.removeEventListener("visibilitychange", this.#onVisibility);
      this.#detector.stop();
      this.#close();
    }
    #onKey = (event) => {
      if (event.defaultPrevented || !ShortcutKeys.isCommandShift(event, this.#policy.letter)) {
        return;
      }
      if (this.#document.pictureInPictureElement !== null) {
        this.#consume(event);
        this.#close();
        return;
      }
      const video = this.#detector.inCall() ? CallVideo.pick(this.#document) : null;
      if (video !== null) {
        this.#consume(event);
        this.#open(video);
      }
    };
    #onVisibility = () => {
      if (!this.#document.hidden) {
        this.#close();
      }
    };
    #onCall(inCall) {
      if (!inCall) {
        this.#close();
      }
    }
    #consume(event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    #open(video) {
      video.disablePictureInPicture = false;
      video.requestPictureInPicture().catch(() => this.#warnOnce("request-failed"));
    }
    #close() {
      if (this.#document.pictureInPictureElement !== null) {
        this.#document.exitPictureInPicture().catch(() => void 0);
      }
    }
    #warnOnce(reason) {
      if (!this.#warned) {
        this.#warned = true;
        this.#warn(reason);
      }
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

  // src/page/call-pip.ts
  var INSTALL = new PageInstall("vivarcdi.call.pip");
  function install(policy) {
    const warn = (reason) => sendToInterface({ type: CALL_MESSAGE_TYPE, token: policy.token, tabId: policy.tabId, reason }, CALL_CONSOLE_PREFIX);
    if (document.pictureInPictureEnabled !== true) {
      INSTALL.remove();
      warn("unsupported-page");
      return;
    }
    INSTALL.replace(new CallPipHook(policy, document, warn));
  }
  function uninstall() {
    INSTALL.remove();
  }
  return __toCommonJS(call_pip_exports);
})();
