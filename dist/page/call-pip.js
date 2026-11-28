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

  // src/page/lib/BrowserPicture.ts
  var HIDDEN_VIDEO = "position:fixed;left:-9999px;width:2px;height:2px";
  var MUTED_ATTRIBUTE = "data-is-muted";
  var BrowserPictureEnvironment = class {
    #document;
    /**
     * The canvas, the hidden video and the images of the real page.
     *
     * @param document The document of the call page.
     */
    constructor(document2) {
      this.#document = document2;
    }
    createCanvas() {
      return this.#document.createElement("canvas");
    }
    createVideo() {
      const video = this.#document.createElement("video");
      video.style.cssText = HIDDEN_VIDEO;
      this.#document.body.appendChild(video);
      return video;
    }
    createImage() {
      return new Image();
    }
  };
  var observeMuted = (element, onChange) => {
    if (typeof MutationObserver === "undefined") {
      return () => void 0;
    }
    const observer = new MutationObserver(onChange);
    observer.observe(element, { attributes: true, attributeFilter: [MUTED_ATTRIBUTE] });
    return () => observer.disconnect();
  };

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

  // src/page/lib/CallControls.ts
  var SELECTOR_OF = { microphone: "microphone", camera: "camera", leave: "inCall" };
  var MUTED_ATTRIBUTE2 = "data-is-muted";
  var ACTION_GRACE_MS = 3e3;
  var CallControls = class {
    #root;
    #selectors;
    #session;
    #observe;
    #warn;
    #pager = null;
    #registered = [];
    #watching = [];
    #lastAction = Number.NEGATIVE_INFINITY;
    /**
     * The buttons of the floating window: microphone, camera and leave the call act on the matching
     * controls of the call page, the microphone and camera buttons show the page's state, and the previous
     * and next buttons move the pages of the picture.
     *
     * @param parts The page, the selectors of the three controls, the Media Session, the muted-attribute
     * watcher and what tells the interface that a control was not found.
     */
    constructor(parts) {
      this.#root = parts.root;
      this.#selectors = parts.selectors;
      this.#session = parts.session;
      this.#observe = parts.observe;
      this.#warn = parts.warn;
    }
    opened(pager) {
      this.closed();
      this.#pager = pager;
      this.#register("togglemicrophone", () => this.#click("microphone"));
      this.#register("togglecamera", () => this.#click("camera"));
      this.#register("hangup", () => this.#click("leave"));
      this.#register("previoustrack", () => pager.previous());
      this.#register("nexttrack", () => pager.next());
      this.#follow("microphone", (active) => this.#session?.setMicrophoneActive?.(active));
      this.#follow("camera", (active) => this.#session?.setCameraActive?.(active));
    }
    closed() {
      this.#registered.forEach((action) => this.#unregister(action));
      this.#registered = [];
      this.#watching.forEach((stop) => stop());
      this.#watching = [];
      this.#pager = null;
    }
    /**
     * @returns Whether a button of the window acted on the call a moment ago. The browser can bring the
     * call tab forward while it runs the action, which is not the user going back to the tab.
     */
    actedRecently() {
      return Date.now() - this.#lastAction < ACTION_GRACE_MS;
    }
    /**
     * Moves the pages of the picture with an arrow key.
     *
     * @param key `ArrowLeft` or `ArrowRight`.
     * @returns Whether the window is open and the key moved a page.
     */
    page(key) {
      if (this.#pager === null || key !== "ArrowLeft" && key !== "ArrowRight") {
        return false;
      }
      if (key === "ArrowLeft") {
        this.#pager.previous();
      } else {
        this.#pager.next();
      }
      return true;
    }
    #click(name) {
      this.#lastAction = Date.now();
      const control = this.#root.querySelector(this.#selectors[SELECTOR_OF[name]]);
      if (control === null) {
        this.#warn("control-not-found");
        return;
      }
      control.click();
    }
    #follow(name, report) {
      const control = this.#root.querySelector(this.#selectors[name]);
      if (control === null) {
        return;
      }
      const update = () => report(control.getAttribute(MUTED_ATTRIBUTE2) !== "true");
      update();
      this.#watching.push(this.#observe(control, update));
    }
    #register(action, handler) {
      try {
        this.#session?.setActionHandler(action, handler);
        this.#registered.push(action);
      } catch {
        return;
      }
    }
    #unregister(action) {
      try {
        this.#session?.setActionHandler(action, null);
      } catch {
        return;
      }
    }
  };

  // src/page/lib/CallDetector.ts
  var POLL_MS = 1e3;
  var LEAVE_CHECKS = 3;
  var CallDetector = class {
    #root;
    #selector;
    #onChange;
    #timer = null;
    #active = false;
    #absent = 0;
    /**
     * Follows whether a page shows a call in progress: the site's in-call view is there.
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
      return this.#root.querySelector(this.#selector) !== null;
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
     * Compares the page with the last state and reports a change. A call is reported as left only after
     * several checks in a row find it absent, because the page redraws its tiles when a camera is turned on.
     */
    check() {
      const now = this.inCall();
      this.#absent = now ? 0 : this.#absent + 1;
      if (now !== this.#active && (now || this.#absent >= LEAVE_CHECKS)) {
        this.#active = now;
        this.#onChange(now);
      }
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
  function isLiveVideo(video) {
    const stream = video.srcObject;
    const tracks = stream?.getVideoTracks?.() ?? [];
    return !video.paused && !video.ended && tracks.some((track) => track.readyState === "live" && track.muted !== true);
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

  // src/page/lib/CallTiles.ts
  function largestAvatar(tile, selector) {
    const images = Array.from(tile.querySelectorAll(selector));
    const largest = images.reduce((best, image) => best === null || image.naturalWidth > best.naturalWidth ? image : best, null);
    return largest?.src ?? null;
  }
  function areaOf2(tile) {
    const { width, height } = tile.getBoundingClientRect();
    return width * height;
  }
  var CallTiles = class {
    /**
     * Reads the tiles of a call page: one per participant, the user's own included, in page order. The
     * page's names and texts are never read.
     *
     * @param root The document of a call page.
     * @param selectors The tile and avatar selectors of the site.
     * @returns The tiles, each with its live video or its avatar picture.
     */
    static read(root, selectors) {
      return Array.from(root.querySelectorAll(selectors.tile), (tile) => ({
        video: Array.from(tile.querySelectorAll("video")).find(isLiveVideo) ?? null,
        avatar: largestAvatar(tile, selectors.avatar),
        area: areaOf2(tile)
      }));
    }
  };

  // src/page/lib/PipCommand.ts
  var OpenPipCommand = class {
    #environment;
    #allowed;
    #source;
    /**
     * Floats the call in Picture in Picture.
     *
     * @param environment The page and what it knows about the call.
     * @param allowed Whether the browser would honor the request now, such as a check for user activation.
     * @param source What to float: the whole call, or its largest video.
     */
    constructor(environment, allowed, source) {
      this.#environment = environment;
      this.#allowed = allowed;
      this.#source = source;
    }
    execute() {
      const { document: document2, inCall } = this.#environment;
      if (document2.pictureInPictureElement !== null || !this.#allowed() || !inCall()) {
        return false;
      }
      return this.#source.open();
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

  // src/page/lib/CredentialedAvatars.ts
  var CredentialedAvatars = class {
    #create;
    #images = /* @__PURE__ */ new Map();
    /**
     * Loads each avatar again with `crossOrigin = 'use-credentials'`, which the avatar host approves for the
     * call site. The page's own copy has no such approval and would taint the canvas it is drawn on, so it
     * is never drawn.
     *
     * @param create Makes an empty image.
     */
    constructor(create) {
      this.#create = create;
    }
    /**
     * @param src The address of an avatar, or null.
     * @returns The loaded picture, or null while it loads, when it fails or when there is no address.
     */
    picture(src) {
      if (src === null) {
        return null;
      }
      let image = this.#images.get(src);
      if (image === void 0) {
        image = this.#create();
        image.crossOrigin = "use-credentials";
        image.src = src;
        this.#images.set(src, image);
      }
      return image.complete && image.naturalWidth > 0 ? image : null;
    }
  };

  // src/page/lib/TileLayout.ts
  var SPOTLIGHT_SHARE = 0.7;
  var ASPECT_WIDTH = 16;
  var ASPECT_HEIGHT = 9;
  var TILE_ASPECT = ASPECT_WIDTH / ASPECT_HEIGHT;
  function fittedArea(width, height) {
    const fitted = Math.min(width, height * TILE_ASPECT);
    return fitted * (fitted / TILE_ASPECT);
  }
  function bestColumns(count, area) {
    let best = 1;
    let bestArea = 0;
    for (let columns = 1; columns <= Math.max(1, count); columns += 1) {
      const rows = Math.ceil(count / columns);
      const cell = fittedArea(area.width / columns, area.height / rows);
      if (cell > bestArea) {
        best = columns;
        bestArea = cell;
      }
    }
    return best;
  }
  function grid(tiles, area) {
    const columns = bestColumns(tiles.length, area);
    const rows = Math.max(1, Math.ceil(tiles.length / columns));
    const width = area.width / columns;
    const height = area.height / rows;
    return tiles.map((tile, index) => ({
      tile,
      rect: { x: area.x + index % columns * width, y: area.y + Math.floor(index / columns) * height, width, height }
    }));
  }
  var TileLayout = class {
    /**
     * Places the tiles of a page on a picture: the primary tile large on the left with the others
     * beside it, or a grid when no tile stands out.
     *
     * @param page The page of tiles to show.
     * @param width The width of the picture.
     * @param height The height of the picture.
     * @returns Each tile with the rectangle it fills.
     */
    static place(page, width, height) {
      const { primary, others } = page;
      if (primary === null) {
        return grid(others, { x: 0, y: 0, width, height });
      }
      if (others.length === 0) {
        return [{ tile: primary, rect: { x: 0, y: 0, width, height } }];
      }
      const main = width * SPOTLIGHT_SHARE;
      return [{ tile: primary, rect: { x: 0, y: 0, width: main, height } }, ...grid(others, { x: main, y: 0, width: width - main, height })];
    }
  };

  // src/page/lib/PipPicture.ts
  var WIDTH = 1280;
  var HEIGHT = 720;
  var FRAME_MS = 66;
  var FRAME_RATE = 15;
  var BACKGROUND = "#202124";
  var TILE_BACKGROUND = "#3c4043";
  var SILHOUETTE = "#9aa0a6";
  var GAP = 2;
  var AVATAR_SHARE = 0.25;
  function drawContained(context, video, rect) {
    const scale = Math.min(rect.width / video.videoWidth, rect.height / video.videoHeight);
    const width = video.videoWidth * scale;
    const height = video.videoHeight * scale;
    context.save();
    context.beginPath();
    context.rect(rect.x, rect.y, rect.width, rect.height);
    context.clip();
    context.drawImage(video, rect.x + (rect.width - width) / 2, rect.y + (rect.height - height) / 2, width, height);
    context.restore();
  }
  function drawAvatar(context, picture, rect) {
    const radius = Math.min(rect.width, rect.height) * AVATAR_SHARE;
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    context.save();
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.clip();
    if (picture === null) {
      context.fillStyle = SILHOUETTE;
      context.fillRect(rect.x, rect.y, rect.width, rect.height);
    } else {
      context.drawImage(picture, centerX - radius, centerY - radius, radius * 2, radius * 2);
    }
    context.restore();
  }
  var PipPicture = class {
    #environment;
    #pager;
    #avatars;
    #context = null;
    #stream = null;
    #video = null;
    #timer = null;
    /**
     * The call as one picture: every tile of the page drawn on a canvas that is redrawn about fifteen times a
     * second, played in a hidden video that can be floated. A page with a floating window is not throttled,
     * so a plain interval keeps its rate while the call tab is hidden.
     *
     * @param environment Makes the canvas, the video and the images.
     * @param pager The page of tiles to draw.
     */
    constructor(environment, pager) {
      this.#environment = environment;
      this.#pager = pager;
      this.#avatars = new CredentialedAvatars(() => environment.createImage());
    }
    /**
     * Draws the first picture, starts the stream and plays it.
     *
     * @returns The video to float.
     * @throws {Error} When the canvas cannot be used; nothing is left behind.
     */
    async open() {
      try {
        const canvas = this.#environment.createCanvas();
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        this.#context = canvas.getContext("2d");
        if (this.#context === null) {
          throw new Error("The canvas has no 2d context");
        }
        this.#draw();
        const video = this.#environment.createVideo();
        this.#video = video;
        video.muted = true;
        video.playsInline = true;
        video.disablePictureInPicture = false;
        this.#stream = canvas.captureStream(FRAME_RATE);
        video.srcObject = this.#stream;
        this.#timer = setInterval(() => this.#draw(), FRAME_MS);
        await video.play();
        return video;
      } catch (error) {
        this.dispose();
        throw error;
      }
    }
    /**
     * Stops drawing, stops the stream and removes the video.
     */
    dispose() {
      if (this.#timer !== null) {
        clearInterval(this.#timer);
      }
      this.#timer = null;
      this.#stream?.getTracks().forEach((track) => track.stop());
      this.#stream = null;
      this.#video?.remove();
      this.#video = null;
      this.#context = null;
    }
    #draw() {
      const context = this.#context;
      if (context === null) {
        return;
      }
      context.fillStyle = BACKGROUND;
      context.fillRect(0, 0, WIDTH, HEIGHT);
      TileLayout.place(this.#pager.current(), WIDTH, HEIGHT).forEach((placed) => this.#paint(context, placed));
    }
    #paint(context, { tile, rect }) {
      const inner = { x: rect.x + GAP, y: rect.y + GAP, width: rect.width - GAP * 2, height: rect.height - GAP * 2 };
      context.fillStyle = TILE_BACKGROUND;
      context.fillRect(inner.x, inner.y, inner.width, inner.height);
      if (this.#shows(tile)) {
        drawContained(context, tile.video, inner);
      } else {
        drawAvatar(context, this.#avatars.picture(tile.avatar), inner);
      }
    }
    #shows(tile) {
      return tile.video !== null && tile.video.videoWidth > 0 && tile.video.videoHeight > 0;
    }
  };

  // src/page/lib/TilePager.ts
  var PRIMARY_RATIO = 1.5;
  function primaryOf(tiles) {
    const [largest, second] = [...tiles].sort((a, b) => b.area - a.area);
    return largest !== void 0 && second !== void 0 && largest.area > 0 && largest.area >= PRIMARY_RATIO * second.area ? largest : null;
  }
  var TilePager = class {
    #maxTiles;
    #read;
    #index = 0;
    /**
     * Shows the tiles of a call a page at a time. The primary tile, when there is one, stays on every
     * page and counts towards `maxTiles`.
     *
     * @param maxTiles How many tiles one page holds.
     * @param read Reads the tiles of the call as they are now.
     */
    constructor(maxTiles, read) {
      this.#maxTiles = maxTiles;
      this.#read = read;
    }
    /**
     * @returns The page to show now; the page number is kept inside the pages that exist.
     */
    current() {
      const { primary, rest, size, pages } = this.#split();
      this.#index = Math.min(this.#index, pages - 1);
      return { primary, others: rest.slice(this.#index * size, (this.#index + 1) * size) };
    }
    /**
     * Moves to the next page, or stays on the last one.
     */
    next() {
      this.#move(1);
    }
    /**
     * Moves to the previous page, or stays on the first one.
     */
    previous() {
      this.#move(-1);
    }
    #move(step) {
      const { pages } = this.#split();
      this.#index = Math.max(0, Math.min(this.#index + step, pages - 1));
    }
    #split() {
      const tiles = this.#read();
      const primary = primaryOf(tiles);
      const rest = tiles.filter((tile) => tile !== primary);
      const size = Math.max(1, primary === null ? this.#maxTiles : this.#maxTiles - 1);
      return { primary, rest, size, pages: Math.max(1, Math.ceil(rest.length / size)) };
    }
  };

  // src/page/lib/PipSource.ts
  var LargestVideoSource = class {
    #document;
    #warn;
    /**
     * Floats the largest live video of the page: the behavior of spec 054, used when the whole call cannot
     * be composed.
     *
     * @param document The document of the call page.
     * @param warn Tells the interface that something on the page is not as expected.
     */
    constructor(document2, warn) {
      this.#document = document2;
      this.#warn = warn;
    }
    open() {
      const video = CallVideo.pick(this.#document);
      if (video === null) {
        return false;
      }
      video.disablePictureInPicture = false;
      video.requestPictureInPicture().catch(() => this.#warn("request-failed"));
      return true;
    }
    release() {
      return void 0;
    }
  };
  var ComposedPipSource = class {
    #parts;
    #picture = null;
    /**
     * Floats the whole call as one picture. A page with no tiles, or a picture that cannot be built or
     * floated, falls back to the largest video with one warning.
     *
     * @param parts What the source needs.
     */
    constructor(parts) {
      this.#parts = parts;
    }
    open() {
      if (this.#picture !== null) {
        return false;
      }
      if (this.#parts.read().length === 0) {
        return this.#parts.fallback.open();
      }
      this.#float().catch(() => {
        this.#parts.warn("composition-failed");
        this.#parts.fallback.open();
      });
      return true;
    }
    release() {
      this.#picture?.dispose();
      this.#picture = null;
      this.#parts.observer.closed();
    }
    async #float() {
      const { environment, read, maxTiles, observer } = this.#parts;
      const pager = new TilePager(maxTiles, read);
      const picture = new PipPicture(environment, pager);
      this.#picture = picture;
      try {
        const video = await picture.open();
        await video.requestPictureInPicture();
        video.addEventListener("leavepictureinpicture", () => this.release());
        observer.opened(pager);
      } catch (error) {
        this.release();
        throw error;
      }
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
    #source;
    #controls;
    #warned = false;
    /**
     * Floats the call of a page in Picture in Picture on Cmd/Ctrl+Shift and a letter, or when the
     * interface asks for it after a tab switch, and closes the window when the tab is shown again or
     * the call ends. The window shows the whole call and carries its buttons. Each action is a command.
     *
     * @param policy The letter, the selectors, the page size and the identity of the page.
     * @param document The document of the call page.
     * @param warn Tells the interface that something on the page is not as expected.
     * @param services What the picture and the buttons of the window use.
     */
    constructor(policy, document2, warn, services) {
      this.#document = document2;
      this.#letter = policy.letter;
      this.#close = new ClosePipCommand(document2);
      this.#detector = new CallDetector(document2, policy.selectors.inCall, (inCall) => !inCall && this.closeWindow());
      const warnOnce = (reason) => this.#warnOnce(reason, warn);
      this.#controls = new CallControls({ root: document2, selectors: policy.selectors, session: services.mediaSession, observe: services.observe, warn: warnOnce });
      this.#source = new ComposedPipSource({
        environment: services.environment,
        read: () => CallTiles.read(document2, policy.selectors),
        maxTiles: policy.maxTiles,
        fallback: new LargestVideoSource(document2, warnOnce),
        observer: this.#controls,
        warn: warnOnce
      });
      const environment = { document: document2, inCall: () => this.#detector.inCall() };
      this.#openFromKey = new OpenPipCommand(environment, () => true, this.#source);
      this.#openOnTabSwitch = new OpenPipCommand(environment, hasUserActivation, this.#source);
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
      this.#source.release();
    }
    #onKey = (event) => {
      if (this.#pageWithArrow(event)) {
        return;
      }
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
      if (!this.#document.hidden && !this.#controls.actedRecently()) {
        this.closeWindow();
      }
    };
    #pageWithArrow(event) {
      const plain = !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
      const moved = plain && !event.defaultPrevented && this.#controls.page(event.key);
      if (moved) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      return moved;
    }
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
  function pageServices() {
    const session = globalThis.navigator?.mediaSession ?? null;
    return { environment: new BrowserPictureEnvironment(document), mediaSession: session, observe: observeMuted };
  }
  var installed = null;
  function install(policy, services) {
    const warn = (reason) => sendToInterface({ type: CALL_MESSAGE_TYPE, token: policy.token, tabId: policy.tabId, reason }, CALL_CONSOLE_PREFIX);
    if (document.pictureInPictureEnabled !== true) {
      INSTALL.remove();
      installed = null;
      warn("unsupported-page");
      return;
    }
    installed = new CallPipHook(policy, document, warn, services ?? pageServices());
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
