import { SiteComparator } from "./SiteComparator.js";
const MAIN_BUTTON = 0;
const WEB_PROTOCOLS = /* @__PURE__ */ new Set(["http:", "https:"]);
class LinkClassifier {
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
      triggers.anyCrossSite ? (click, crossSite) => !click.pinned && crossSite : null,
      triggers.pinnedNewTab ? (click) => click.pinned && LinkClassifier.#asksNewTab(click) : null,
      triggers.anyNewTab ? (click) => !click.pinned && LinkClassifier.#asksNewTab(click) : null
    ].filter((rule) => rule !== null);
  }
  /**
   * @param click The click on a link.
   * @returns Whether it opens Peek, and what Vivaldi would have done instead.
   */
  classify(click) {
    const disposition = LinkClassifier.#dispositionOf(click);
    if (!this.#isCandidate(click)) {
      return { peek: false, disposition };
    }
    const crossSite = !click.shiftKey && !this.#sites.sameSite(click.href, click.pageUrl);
    return { peek: this.#rules.some((rule) => rule(click, crossSite)), disposition };
  }
  #isCandidate(click) {
    const plainOrShift = !click.ctrlKey && !click.metaKey && !click.altKey;
    return click.button === MAIN_BUTTON && plainOrShift && LinkClassifier.#isWebUrl(click.href);
  }
  static #asksNewTab(click) {
    return click.target === "_blank";
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
}
export {
  LinkClassifier
};
