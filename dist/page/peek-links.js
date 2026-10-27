"use strict";
var VivArcDiPeekLinks = (() => {
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

  // src/page/peek-links.ts
  var peek_links_exports = {};
  __export(peek_links_exports, {
    install: () => install,
    uninstall: () => uninstall
  });

  // src/modules/peek/SiteComparator.ts
  var TWO_LABEL_SUFFIXES = /* @__PURE__ */ new Set([
    "ac.uk",
    "co.uk",
    "gov.uk",
    "ltd.uk",
    "me.uk",
    "net.uk",
    "org.uk",
    "plc.uk",
    "sch.uk",
    "com.au",
    "net.au",
    "org.au",
    "edu.au",
    "gov.au",
    "co.jp",
    "ne.jp",
    "or.jp",
    "ac.jp",
    "go.jp",
    "co.nz",
    "org.nz",
    "net.nz",
    "govt.nz",
    "co.za",
    "org.za",
    "co.in",
    "net.in",
    "org.in",
    "firm.in",
    "com.br",
    "net.br",
    "org.br",
    "gov.br",
    "com.mx",
    "com.ar",
    "com.tr",
    "com.cn",
    "net.cn",
    "org.cn",
    "com.hk",
    "com.sg",
    "com.tw",
    "co.kr",
    "or.kr",
    "co.il",
    "co.id",
    "com.my",
    "com.ph",
    "github.io",
    "gitlab.io",
    "herokuapp.com",
    "netlify.app",
    "vercel.app",
    "pages.dev",
    "blogspot.com"
  ]);
  var IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
  var SITE_LABELS = 2;
  var SiteComparator = class _SiteComparator {
    /**
     * The site of a URL: its registrable domain, such as `google.com` for
     * `https://mail.google.com/` or `bbc.co.uk` for `https://www.bbc.co.uk/`.
     * IP addresses and single-label hosts are returned whole.
     *
     * @param url Absolute URL.
     * @returns The site, or null when the URL has no host.
     */
    siteOf(url) {
      const host = _SiteComparator.#hostOf(url);
      if (host === null || IPV4.test(host) || host.startsWith("[") || !host.includes(".")) {
        return host;
      }
      const labels = host.split(".");
      const lastTwo = labels.slice(-SITE_LABELS).join(".");
      const kept = TWO_LABEL_SUFFIXES.has(lastTwo) ? SITE_LABELS + 1 : SITE_LABELS;
      return labels.slice(-kept).join(".");
    }
    /**
     * @param first Absolute URL.
     * @param second Absolute URL.
     * @returns Whether both URLs belong to the same site.
     */
    sameSite(first, second) {
      const site = this.siteOf(first);
      return site !== null && site === this.siteOf(second);
    }
    static #hostOf(url) {
      try {
        const host = new URL(url).hostname.toLowerCase().replace(/\.$/, "");
        return host === "" ? null : host;
      } catch {
        return null;
      }
    }
  };

  // src/modules/peek/LinkClassifier.ts
  var MAIN_BUTTON = 0;
  var WEB_PROTOCOLS = /* @__PURE__ */ new Set(["http:", "https:"]);
  var LinkClassifier = class _LinkClassifier {
    #rules;
    #sites;
    /**
     * Decides whether a click on a link opens Peek. Each enabled trigger is one rule;
     * the click opens Peek when any rule accepts it.
     *
     * @param triggers Which triggers are enabled.
     * @param sites Site comparison.
     */
    constructor(triggers, sites = new SiteComparator()) {
      this.#sites = sites;
      this.#rules = [
        triggers.shiftClick ? (click) => click.shiftKey : null,
        triggers.pinnedCrossSite ? (click, crossSite) => click.pinned && crossSite : null,
        triggers.anyCrossSite ? (click, crossSite) => !click.pinned && crossSite : null
      ].filter((rule) => rule !== null);
    }
    /**
     * @param click The click on a link.
     * @returns Whether it opens Peek, and what Vivaldi would have done instead.
     */
    classify(click) {
      const disposition = _LinkClassifier.#dispositionOf(click);
      if (!this.#isCandidate(click)) {
        return { peek: false, disposition };
      }
      const crossSite = !click.shiftKey && !this.#sites.sameSite(click.href, click.pageUrl);
      return { peek: this.#rules.some((rule) => rule(click, crossSite)), disposition };
    }
    #isCandidate(click) {
      const plainOrShift = !click.ctrlKey && !click.metaKey && !click.altKey;
      return click.button === MAIN_BUTTON && plainOrShift && _LinkClassifier.#isWebUrl(click.href);
    }
    static #dispositionOf(click) {
      if (click.shiftKey) {
        return "new-window";
      }
      return click.target === "_blank" ? "new-tab" : "same-tab";
    }
    static #isWebUrl(href) {
      try {
        return WEB_PROTOCOLS.has(new URL(href).protocol);
      } catch {
        return false;
      }
    }
  };

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

  // src/page/peek-links.ts
  var INSTANCE_KEY = /* @__PURE__ */ Symbol.for("vivarcdi.peek.links");
  var PeekLinkListener = class {
    #policy;
    #classifier;
    #listener = (event) => this.#handle(event);
    constructor(policy) {
      this.#policy = policy;
      this.#classifier = new LinkClassifier(policy.triggers);
    }
    attach() {
      globalThis.addEventListener("click", this.#listener, true);
    }
    detach() {
      globalThis.removeEventListener("click", this.#listener, true);
    }
    #handle(event) {
      const anchor = event.composedPath().find((node) => node instanceof HTMLAnchorElement);
      if (anchor === void 0 || anchor.href === "" || event.defaultPrevented) {
        return;
      }
      const { peek, disposition } = this.#classifier.classify({
        button: event.button,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        href: anchor.href,
        target: anchor.target,
        pageUrl: globalThis.location.href,
        pinned: this.#policy.pinned
      });
      if (!peek) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      const { tabId, token } = this.#policy;
      sendToInterface({ type: PEEK_MESSAGE_TYPE, token, action: "open", url: anchor.href, tabId, disposition });
    }
  };
  function install(policy) {
    uninstall();
    const listener = new PeekLinkListener(policy);
    listener.attach();
    globalThis[INSTANCE_KEY] = listener;
  }
  function uninstall() {
    const registry = globalThis;
    registry[INSTANCE_KEY]?.detach();
    registry[INSTANCE_KEY] = void 0;
  }
  return __toCommonJS(peek_links_exports);
})();
