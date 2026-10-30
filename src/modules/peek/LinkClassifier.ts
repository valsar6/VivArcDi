import { SiteComparator } from './SiteComparator.js';

export type Disposition = 'new-window' | 'new-tab' | 'same-tab';

export interface PeekTriggers {
  /** Shift+click on a link opens Peek. */
  shiftClick: boolean;
  /** A link to another site in a Favorite or pinned tab opens Peek. */
  pinnedCrossSite: boolean;
  /** A link to another site in any other tab opens Peek. */
  anyCrossSite: boolean;
  /** A link that asks for a new tab or window in a Favorite or pinned tab opens Peek, on any site. */
  pinnedNewTab: boolean;
  /** A link that asks for a new tab or window in any other tab opens Peek. */
  anyNewTab: boolean;
}

export interface LinkClick {
  /** Mouse button, 0 for the main one. */
  button: number;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  /** Absolute URL of the link. */
  href: string;
  /** The link's `target` attribute. */
  target: string;
  /** URL of the page that holds the link. */
  pageUrl: string;
  /** Whether the page is in a Favorite or pinned tab. */
  pinned: boolean;
}

export interface PeekDecision {
  /** Whether the click opens Peek. */
  peek: boolean;
  /** What Vivaldi would have done with the click. */
  disposition: Disposition;
}

type Rule = (click: LinkClick, crossSite: boolean) => boolean;

const MAIN_BUTTON = 0;
const WEB_PROTOCOLS = new Set(['http:', 'https:']);

export class LinkClassifier {
  #rules: Rule[];
  #sites: SiteComparator;

  /**
   * Decides whether a click on a link opens Peek. Each enabled trigger is one rule;
   * the click opens Peek when any rule accepts it.
   *
   * @param triggers Which triggers are enabled.
   * @param sites Site comparison.
   */
  constructor(triggers: PeekTriggers, sites: SiteComparator = new SiteComparator()) {
    this.#sites = sites;
    this.#rules = [
      triggers.shiftClick ? (click: LinkClick): boolean => click.shiftKey : null,
      triggers.pinnedCrossSite ? (click: LinkClick, crossSite: boolean): boolean => click.pinned && crossSite : null,
      triggers.anyCrossSite ? (click: LinkClick, crossSite: boolean): boolean => !click.pinned && crossSite : null,
      triggers.pinnedNewTab ? (click: LinkClick): boolean => click.pinned && LinkClassifier.#asksNewTab(click) : null,
      triggers.anyNewTab ? (click: LinkClick): boolean => !click.pinned && LinkClassifier.#asksNewTab(click) : null,
    ].filter((rule): rule is Rule => rule !== null);
  }

  /**
   * @param click The click on a link.
   * @returns Whether it opens Peek, and what Vivaldi would have done instead.
   */
  public classify(click: LinkClick): PeekDecision {
    const disposition = LinkClassifier.#dispositionOf(click);
    if (!this.#isCandidate(click)) {
      return { peek: false, disposition };
    }
    const crossSite = !click.shiftKey && !this.#sites.sameSite(click.href, click.pageUrl);
    return { peek: this.#rules.some((rule) => rule(click, crossSite)), disposition };
  }

  #isCandidate(click: LinkClick): boolean {
    const plainOrShift = !click.ctrlKey && !click.metaKey && !click.altKey;
    return click.button === MAIN_BUTTON && plainOrShift && LinkClassifier.#isWebUrl(click.href);
  }

  static #asksNewTab(click: LinkClick): boolean {
    return click.target === '_blank';
  }

  static #dispositionOf(click: LinkClick): Disposition {
    if (click.shiftKey) {
      return 'new-window';
    }
    return click.target === '_blank' ? 'new-tab' : 'same-tab';
  }

  static #isWebUrl(href: string): boolean {
    try {
      return WEB_PROTOCOLS.has(new URL(href).protocol);
    } catch {
      return false;
    }
  }
}
