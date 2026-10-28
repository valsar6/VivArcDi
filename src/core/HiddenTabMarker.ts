import { DomQuery } from './DomQuery.js';
import { FrameTask } from './FrameTask.js';
import type { FrameTiming } from './FrameTask.js';
import type { HiddenTabs } from './HiddenTabs.js';
import type { SelectorCatalog } from './SelectorCatalog.js';
import { TabSlot } from './TabSlot.js';

export type StripWatcher = (target: Node, onChange: () => void) => () => void;

export const HIDDEN_ATTRIBUTE = 'data-vivarcdi-hidden';

const watchSubtree: StripWatcher = (target, onChange) => {
  const observer = new MutationObserver(onChange);
  observer.observe(target, { childList: true, subtree: true });
  return () => observer.disconnect();
};

export class HiddenTabMarker {
  #document: Document;
  #selectors: SelectorCatalog;
  #hidden: HiddenTabs;
  #watch: StripWatcher;
  #task: FrameTask;
  #stops: Array<() => void> = [];

  /**
   * Marks the slots of Vivaldi's tab strip whose tab is hidden, so that a stylesheet can take them
   * out of the list. The marks are data attributes, which Vivaldi's redraws of the strip leave
   * alone; the marker still repeats them after every change of the strip, for slots that are new.
   * Several markers may run at once, since each one writes the marks the shared set asks for.
   *
   * @param document The browser window document.
   * @param selectors Needs `browser`, `tabStrip` and `tabWrapper`.
   * @param hidden The tabs to hide.
   * @param watch Reports changes under the browser root, replaceable in tests.
   * @param timing Frame scheduling for the repeats, replaceable in tests.
   */
  constructor(document: Document, selectors: SelectorCatalog, hidden: HiddenTabs, watch: StripWatcher = watchSubtree, timing: FrameTiming = {}) {
    this.#document = document;
    this.#selectors = selectors;
    this.#hidden = hidden;
    this.#watch = watch;
    this.#task = new FrameTask(() => this.apply(), timing);
  }

  /**
   * Marks the slots now and keeps marking them.
   *
   * @throws {Error} When the browser root is not found.
   */
  public start(): void {
    const root = DomQuery.require(this.#document, this.#selectors.get('browser'));
    this.#stops = [this.#watch(root, () => this.#task.request()), this.#hidden.onChange(() => this.apply())];
    this.apply();
  }

  /**
   * Stops following the strip and the hidden tabs. The marks stay as the shared set of hidden tabs
   * says, so a module clears its own ids before it stops its marker.
   */
  public stop(): void {
    this.#task.cancel();
    this.#stops.forEach((stop) => stop());
    this.#stops = [];
  }

  /**
   * Marks the slots of hidden tabs and unmarks the others.
   */
  public apply(): void {
    const strip = this.#document.querySelector(this.#selectors.get('tabStrip'));
    if (strip === null) {
      return;
    }
    const wrapper = this.#selectors.get('tabWrapper');
    for (const slot of strip.children) {
      const tabId = TabSlot.idOf(slot, wrapper);
      slot.toggleAttribute(HIDDEN_ATTRIBUTE, tabId !== null && this.#hidden.has(tabId));
    }
  }
}
