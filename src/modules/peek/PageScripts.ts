import type { PayloadSource } from '../../core/ResourceLoader.js';
import type { PeekTriggers } from './LinkClassifier.js';

export interface PagePolicy {
  /** Enabled triggers. */
  triggers: PeekTriggers;
  /** Whether the page is in a Favorite or pinned tab. */
  pinned: boolean;
  /** Id of the tab that shows the page. */
  tabId: number;
  /** Secret that proves a message comes from the injected script. */
  token: string;
}

const LINKS_PATH = 'page/peek-links.js';
const KEYS_PATH = 'page/peek-keys.js';
const LINKS_GLOBAL = 'VivArcDiPeekLinks';
const KEYS_GLOBAL = 'VivArcDiPeekKeys';

export class PageScripts {
  #links: string;
  #keys: string;

  /**
   * The code VivArcDi injects into pages with `webview.executeScript`.
   * Each bundle defines one global object whose functions are called after it.
   *
   * @param links Bundle of `src/page/peek-links.ts`.
   * @param keys Bundle of `src/page/peek-keys.ts`.
   */
  constructor(links: string, keys: string) {
    this.#links = links;
    this.#keys = keys;
  }

  /**
   * @param payload Loads the bundles from the payload folder.
   * @returns The scripts, ready to inject.
   */
  public static async load(payload: PayloadSource): Promise<PageScripts> {
    const [links, keys] = await Promise.all([payload.text(LINKS_PATH), payload.text(KEYS_PATH)]);
    return new PageScripts(links, keys);
  }

  /**
   * @param policy Triggers and the state of the tab.
   * @returns Code that starts catching Peek clicks in a tab's page.
   */
  public installLinks(policy: PagePolicy): string {
    return `${this.#links}\n${LINKS_GLOBAL}.install(${JSON.stringify(policy)});`;
  }

  /**
   * @returns Code that stops catching clicks in a page.
   */
  public uninstallLinks(): string {
    return `globalThis.${LINKS_GLOBAL}?.uninstall();`;
  }

  /**
   * @param token Secret that proves a message comes from the injected script.
   * @returns Code that forwards Peek keys from the page shown in the panel.
   */
  public installKeys(token: string): string {
    return `${this.#keys}\n${KEYS_GLOBAL}.install(${JSON.stringify(token)});`;
  }
}
