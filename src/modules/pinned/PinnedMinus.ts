import type { SelectorCatalog } from '../../core/dom/SelectorCatalog.js';
import { watchSubtree } from '../../core/dom/KeptElement.js';
import type { SubtreeWatcher } from '../../core/dom/KeptElement.js';
import { FrameTask } from '../../core/support/FrameTask.js';
import type { FrameTiming } from '../../core/support/FrameTask.js';
import type { Logger } from '../../core/support/Logger.js';
import { TabSlot } from '../../core/tabs/TabSlot.js';
import { TabUnloader } from '../../core/tabs/TabUnloader.js';
import type { UnloaderTabs } from '../../core/tabs/TabUnloader.js';

export const PINNED_UNLOAD_ATTRIBUTE = 'data-vivarcdi-pinned-unload';
export const PINNED_MINUS_ATTRIBUTE = 'data-vivarcdi-pinned-minus';

export interface PinnedMinusDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** Needs `browser`, `pinnedTab`, `tabWrapper` and `tabFavicon`. */
  selectors: SelectorCatalog;
  /** Tabs API, for the unload. */
  tabs: UnloaderTabs;
  /** Reports a failed unload. */
  logger: Pick<Logger, 'error'>;
  /** Watches the tab bar; defaults to a subtree watcher. */
  watch?: SubtreeWatcher;
  /** Frame scheduling, replaceable in tests. */
  timing?: FrameTiming;
}

export class PinnedMinus {
  #deps: PinnedMinusDependencies;
  #unloader: TabUnloader;
  #draw: FrameTask;
  #buttons = new Map<Element, HTMLElement>();
  #unwatch: (() => void) | null = null;
  #onClick = (event: Event): void => this.#handle(event);
  #onPointerDown = (event: Event): void => this.#swallow(event);
  #onMouseDown = (event: Event): void => this.#swallow(event);

  /**
   * The minus at the right end of every pinned row: Vivaldi 8.3 draws no close button there, so
   * the module adds its own and unloads the tab instead of closing it.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: PinnedMinusDependencies) {
    this.#deps = dependencies;
    this.#unloader = new TabUnloader(dependencies.tabs);
    this.#draw = new FrameTask(() => this.sync(), dependencies.timing);
  }

  /**
   * Marks the browser, puts the minuses in place and follows the redraws of the tab bar.
   */
  public start(): void {
    const { document, selectors } = this.#deps;
    document.addEventListener('click', this.#onClick, true);
    document.addEventListener('pointerdown', this.#onPointerDown, true);
    document.addEventListener('mousedown', this.#onMouseDown, true);
    const browser = document.querySelector<Element>(selectors.get('browser'));
    browser?.setAttribute(PINNED_UNLOAD_ATTRIBUTE, '');
    this.#unwatch = (this.#deps.watch ?? watchSubtree())(browser ?? document, () => this.#draw.request());
    this.#draw.request();
  }

  /**
   * Puts the minuses in place once: one per pinned row, replacing the ones Vivaldi dropped.
   */
  public sync(): void {
    const rows = [...this.#deps.document.querySelectorAll<Element>(this.#deps.selectors.get('pinnedTab'))];
    const present = new Set(rows);
    this.#buttons.forEach((button, row) => {
      if (!present.has(row) || !PinnedMinus.#inside(button, row)) {
        button.remove();
        this.#buttons.delete(row);
      }
    });
    rows.forEach((row) => this.#place(row));
  }

  /**
   * Removes the minuses, the mark and every listener.
   */
  public stop(): void {
    this.#deps.document.removeEventListener('click', this.#onClick, true);
    this.#deps.document.removeEventListener('pointerdown', this.#onPointerDown, true);
    this.#deps.document.removeEventListener('mousedown', this.#onMouseDown, true);
    this.#unwatch?.();
    this.#unwatch = null;
    this.#draw.cancel();
    this.#buttons.forEach((button) => button.remove());
    this.#buttons.clear();
    this.#deps.document.querySelector(this.#deps.selectors.get('browser'))?.removeAttribute(PINNED_UNLOAD_ATTRIBUTE);
  }

  #place(row: Element): void {
    const button = this.#buttons.get(row) ?? this.#create();
    if (!PinnedMinus.#inside(button, row)) {
      this.#targetOf(row).append(button);
    }
    this.#buttons.set(row, button);
  }

  #create(): HTMLButtonElement {
    const button = this.#deps.document.createElement('button');
    button.setAttribute('type', 'button');
    button.setAttribute(PINNED_MINUS_ATTRIBUTE, '');
    button.setAttribute('aria-label', 'Unload tab');
    return button;
  }

  #targetOf(row: Element): Element {
    return row.querySelector(this.#deps.selectors.get('tabFavicon'))?.parentElement ?? row;
  }

  #handle(event: Event): void {
    const button = (event.target as Element | null)?.closest?.(`[${PINNED_MINUS_ATTRIBUTE}]`) ?? null;
    if (button === null) {
      return;
    }
    this.#swallow(event);
    const tabId = TabSlot.idOf(button, this.#deps.selectors.get('tabWrapper'));
    if (tabId !== null) {
      this.#unload(tabId);
    }
  }

  #swallow(event: Event): void {
    const button = (event.target as Element | null)?.closest?.(`[${PINNED_MINUS_ATTRIBUTE}]`) ?? null;
    if (button === null) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  #unload(tabId: number): void {
    this.#unloader.unload(tabId).catch((error: unknown) => this.#deps.logger.error(`Could not unload tab ${tabId}`, error));
  }

  static #inside(element: Element, ancestor: Element): boolean {
    let node: Element | null = element;
    while (node !== null) {
      if (node === ancestor) {
        return true;
      }
      node = node.parentElement;
    }
    return false;
  }
}
