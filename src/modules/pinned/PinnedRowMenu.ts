import type { BrowserTabs } from '../../core/browser/BrowserTabs.js';
import type { ContextMenu, MenuItem } from '../../core/dom/ContextMenu.js';
import type { SelectorCatalog } from '../../core/dom/SelectorCatalog.js';
import type { Logger } from '../../core/support/Logger.js';
import { TabSlot } from '../../core/tabs/TabSlot.js';
import { OwnPage } from '../../shared/tabs/OwnPage.js';
import type { PinnedAddress, PinnedPageSnapshot } from '../../shared/linkmenu/PinnedAddress.js';

export interface PinnedRowMenuDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** VivArcDi's own menu, drawn at the pointer. */
  menu: Pick<ContextMenu, 'open' | 'close'>;
  /** Needs `pinnedTab` and `tabWrapper`. */
  selectors: SelectorCatalog;
  tabs: Pick<BrowserTabs, 'get' | 'update' | 'remove'>;
  address: Pick<PinnedAddress, 'menuFor' | 'replace' | 'edit'>;
  logger: Pick<Logger, 'warn'>;
}

const SEPARATOR: MenuItem = { separator: true };

export class PinnedRowMenu {
  #deps: PinnedRowMenuDependencies;
  #onContext = (event: Event): void => this.#context(event as MouseEvent);

  /**
   * VivArcDi's menu of a pinned row, opened with a right click: `Edit Pinned Page ▸` with Replace
   * and Edit…, then a real Close tab and Unpin tab. Vivaldi's own menu is cancelled for pinned rows
   * only; outside it, right clicks are left to Vivaldi.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: PinnedRowMenuDependencies) {
    this.#deps = dependencies;
  }

  /**
   * Starts listening to `contextmenu`, in the capture phase.
   */
  public start(): void {
    this.#deps.document.addEventListener('contextmenu', this.#onContext, true);
  }

  /**
   * Stops listening and closes the menu.
   */
  public stop(): void {
    this.#deps.document.removeEventListener('contextmenu', this.#onContext, true);
    this.#deps.menu.close();
  }

  #context(event: MouseEvent): void {
    const target = event.target as Element | null;
    const row = target?.closest(this.#deps.selectors.get('pinnedTab')) ?? null;
    if (row === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const tabId = TabSlot.idOf(row, this.#deps.selectors.get('tabWrapper'));
    if (tabId !== null) {
      void this.#open(tabId, event.clientX, event.clientY);
    }
  }

  async #open(tabId: number, x: number, y: number): Promise<void> {
    this.#deps.menu.open(this.#items(tabId, await this.#snapshot(tabId)), x, y);
  }

  async #snapshot(tabId: number): Promise<PinnedPageSnapshot> {
    try {
      const tab = await this.#deps.tabs.get(tabId);
      return { saved: OwnPage.of(tab) ?? undefined, current: tab.url ?? tab.pendingUrl, open: true };
    } catch (error) {
      this.#deps.logger.warn(`could not read the pinned tab ${tabId}`, error);
      return { open: false };
    }
  }

  #items(tabId: number, snapshot: PinnedPageSnapshot): MenuItem[] {
    return [
      this.#deps.address.menuFor(String(tabId), snapshot),
      SEPARATOR,
      { label: 'Close tab', run: (): void => void this.#close(tabId) },
      { label: 'Unpin tab', run: (): void => void this.#unpin(tabId) },
    ];
  }

  async #close(tabId: number): Promise<void> {
    try {
      await this.#deps.tabs.remove(tabId);
    } catch (error) {
      this.#deps.logger.warn(`could not close tab ${tabId}`, error);
    }
  }

  async #unpin(tabId: number): Promise<void> {
    try {
      await this.#deps.tabs.update(tabId, { pinned: false });
    } catch (error) {
      this.#deps.logger.warn(`could not unpin tab ${tabId}`, error);
    }
  }
}
