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
    close: () => close,
    install: () => install,
    open: () => open,
    uninstall: () => uninstall
  });

  // src/modules/callpip/CallMessage.ts
  var CALL_MESSAGE_TYPE = "vivarcdi-call-pip";
  var CALL_CONSOLE_PREFIX = "vivarcdi-call-pip:";

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

  // src/page/lib/PipCommand.ts
  var OpenPipCommand = class {
    #environment;
    #allowed;
    /**
     * Floats the call video in Picture in Picture.
     *
     * @param environment The page and what it knows about the call.
     * @param allowed Whether the browser would honor the request now, such as a check for user activation.
     */
    constructor(environment, allowed) {
      this.#environment = environment;
      this.#allowed = allowed;
    }
    execute() {
      const { document: document2, inCall, warn } = this.#environment;
      if (document2.pictureInPictureElement !== null || !this.#allowed() || !inCall()) {
        return false;
      }
      const video = CallVideo.pick(document2);
      if (video === null) {
        return false;
      }
      video.disablePictureInPicture = false;
      video.requestPictureInPicture().catch(() => warn("request-failed"));
      return true;
    }
  };
  var ClosePipCommand = class {
    #document;
    /**
     * Closes the Picture in Picture window of the page.
     *
     * @param document The document of the call page.
     */
    constructor(document2) {
      this.#document = document2;
    }
    execute() {
      if (this.#document.pictureInPictureElement === null) {
        return false;
      }
      this.#document.exitPictureInPicture().catch(() => void 0);
      return true;
    }
  };

  // src/page/lib/CallPipHook.ts
  function hasUserActivation() {
    return globalThis.navigator.userActivation?.isActive === true;
  }
  var CallPipHook = class {
    #document;
    #detector;
    #letter;
    #openFromKey;
    #openOnTabSwitch;
    #close;
    #warned = false;
    /**
     * Floats the call of a page in Picture in Picture on Cmd/Ctrl+Shift and a letter, or when the
     * interface asks for it after a tab switch, and closes the window when the tab is shown again or
     * the call ends. Each action is a command.
     *
     * @param policy The letter, the selector of the in-call view and the identity of the page.
     * @param document The document of the call page.
     * @param warn Tells the interface that something on the page is not as expected.
     */
    constructor(policy, document2, warn) {
      this.#document = document2;
      this.#letter = policy.letter;
      this.#close = new ClosePipCommand(document2);
      this.#detector = new CallDetector(document2, policy.inCallSelector, (inCall) => !inCall && this.#close.execute());
      const environment = { document: document2, inCall: () => this.#detector.inCall(), warn: (reason) => this.#warnOnce(reason, warn) };
      this.#openFromKey = new OpenPipCommand(environment, () => true);
      this.#openOnTabSwitch = new OpenPipCommand(environment, hasUserActivation);
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
    }
    /**
     * Opens the window after a tab switch, when the browser still honors the user's last gesture.
     */
    openOnTabSwitch() {
      this.#openOnTabSwitch.execute();
    }
    /**
     * Closes the window, if one is open.
     */
    closeWindow() {
      this.#close.execute();
    }
    #onKey = (event) => {
      if (event.defaultPrevented || !ShortcutKeys.isCommandShift(event, this.#letter)) {
        return;
      }
      const open2 = this.#document.pictureInPictureElement !== null;
      if (event.repeat) {
        this.#consumeIf(event, open2 || this.#detector.inCall());
        return;
      }
      this.#consumeIf(event, open2 ? this.#close.execute() : this.#openFromKey.execute());
    };
    #onVisibility = () => {
      if (!this.#document.hidden) {
        this.#close.execute();
      }
    };
    #consumeIf(event, handled) {
      if (handled) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }
    #warnOnce(reason, warn) {
      if (!this.#warned) {
        this.#warned = true;
        warn(reason);
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
  var installed = null;
  function install(policy) {
    const warn = (reason) => sendToInterface({ type: CALL_MESSAGE_TYPE, token: policy.token, tabId: policy.tabId, reason }, CALL_CONSOLE_PREFIX);
    if (document.pictureInPictureEnabled !== true) {
      INSTALL.remove();
      installed = null;
      warn("unsupported-page");
      return;
    }
    installed = new CallPipHook(policy, document, warn);
    INSTALL.replace(installed);
  }
  function uninstall() {
    installed?.closeWindow();
    installed = null;
    INSTALL.remove();
  }
  function open() {
    installed?.openOnTabSwitch();
  }
  function close() {
    installed?.closeWindow();
  }
  return __toCommonJS(call_pip_exports);
})();
