import { FrameTask } from '../../core/support/FrameTask.js';
import type { FrameTiming } from '../../core/support/FrameTask.js';
import { GapShifts } from './GapShifts.js';
import type { GapSlot } from './GapShifts.js';
import { HIDDEN_ATTRIBUTE } from './HiddenAttribute.js';
import { Logger } from '../../core/support/Logger.js';
import type { SelectorCatalog } from '../../core/dom/SelectorCatalog.js';
import { StripDragWatch } from './StripDragWatch.js';

export interface CloserOptions {
  /** Frame scheduling for the passes, replaceable in tests. */
  timing?: FrameTiming;
  /** Where the warning goes, replaceable in tests. */
  log?: Logger;
}

export const SHIFT_PROPERTY = '--vivarcdi-gap-shift';

const OFFSET_PROPERTY = '--PositionY';
const HEIGHT_PROPERTY = '--Height';
const MAX_HEIGHT = 'max-height';

export class StripGapCloser {
  static #instances = new WeakMap<object, StripGapCloser>();

  #document: Document;
  #selectors: SelectorCatalog;
  #log: Logger;
  #task: FrameTask;
  #drag: StripDragWatch;
  #users = 0;
  #warned = false;
  #frame: HTMLElement | null = null;
  #original: { value: string; priority: string } | null = null;
  #written: string | null = null;
  #collapsed = new Set<HTMLElement>();
  #shifted = new Set<HTMLElement>();

  /**
   * Closes the space that hidden slots leave in Vivaldi's tab strip. Vivaldi places every slot with
   * an inline offset and sizes the strip from the full list, so a hidden slot leaves a gap. The
   * closer never writes Vivaldi's offsets: it writes a shift next to them, which the stylesheet
   * subtracts, and the height of the strip frame, which it gives back when nothing is hidden.
   *
   * @param document The browser window document.
   * @param selectors Needs `browser`, `tabStrip` and `tabStripFrame`.
   * @param options Replaceable frame scheduling and logger, for tests.
   */
  constructor(document: Document, selectors: SelectorCatalog, { timing = {}, log = new Logger('VivArcDi:gap') }: CloserOptions = {}) {
    this.#document = document;
    this.#selectors = selectors;
    this.#log = log;
    this.#task = new FrameTask(() => this.#pass(), timing);
    this.#drag = new StripDragWatch(
      document,
      (target) => this.#isSlot(target),
      (dragging) => this.#follow(dragging),
    );
  }

  /**
   * The closer shared by every user of a document, since several modules hide tabs at once.
   *
   * @param document The browser window document; the same document gives the same closer.
   * @param selectors The selectors of the running Vivaldi version.
   * @param options Replaceable frame scheduling and logger, used when the closer is created.
   * @returns The shared closer.
   */
  public static of(document: Document, selectors: SelectorCatalog, options: CloserOptions = {}): StripGapCloser {
    const existing = StripGapCloser.#instances.get(document);
    if (existing !== undefined) {
      return existing;
    }
    const created = new StripGapCloser(document, selectors, options);
    StripGapCloser.#instances.set(document, created);
    return created;
  }

  /**
   * Takes a use of the closer; the first use starts watching for drags.
   */
  public acquire(): void {
    this.#users += 1;
    if (this.#users === 1) {
      this.#drag.start();
    }
  }

  /**
   * Gives a use back; the last one removes the corrections and stops watching.
   */
  public release(): void {
    this.#users = Math.max(0, this.#users - 1);
    if (this.#users === 0) {
      this.#task.cancel();
      this.#drag.stop();
      this.#clear();
    }
  }

  /**
   * Asks for a pass on the next frame. Extra requests before then are merged.
   */
  public request(): void {
    if (this.#users > 0) {
      this.#task.request();
    }
  }

  #pass(): void {
    if (this.#users === 0 || this.#drag.dragging) {
      return;
    }
    const strip = this.#element(this.#selector('tabStrip'));
    const frame = this.#element(this.#selector('tabStripFrame'));
    if (strip === null || frame === null) {
      this.#warnOnce();
      this.#clear();
      return;
    }
    const slots = [...strip.children] as HTMLElement[];
    const pinned = this.#pinnedVisible();
    const separators = slots.map((slot) => !pinned && this.#isSeparator(slot));
    slots.forEach((slot, index) => this.#collapse(slot, separators[index] ?? false));
    const correction = GapShifts.compute(slots.map((slot, index) => StripGapCloser.#read(slot, separators[index] ?? false)));
    if (correction === null) {
      this.#clear();
      return;
    }
    slots.forEach((slot, index) => this.#shift(slot, correction.shifts[index] ?? null));
    this.#shrink(frame, correction.hiddenHeight);
  }

  #follow(dragging: boolean): void {
    if (dragging) {
      this.#clear();
    } else {
      this.request();
    }
  }

  #isSlot(target: EventTarget | null): boolean {
    const selector = this.#selector('tabStrip');
    return selector !== null && (target as Element | null)?.closest?.(selector) != null;
  }

  #isSeparator(slot: HTMLElement): boolean {
    const selector = this.#selector('separator');
    return selector !== null && slot.matches(selector);
  }

  #pinnedVisible(): boolean {
    const selector = this.#selector('pinnedTab');
    if (selector === null) {
      return true;
    }
    return [...this.#document.querySelectorAll(selector)].some((tab) => tab.closest(`[${HIDDEN_ATTRIBUTE}]`) === null);
  }

  #collapse(slot: HTMLElement, collapsed: boolean): void {
    if (collapsed) {
      slot.style.setProperty('display', 'none', 'important');
      this.#collapsed.add(slot);
    } else if (this.#collapsed.delete(slot)) {
      slot.style.removeProperty('display');
    }
  }

  #selector(name: string): string | null {
    return this.#selectors.has(name) ? this.#selectors.get(name) : null;
  }

  #element(selector: string | null): HTMLElement | null {
    return selector === null ? null : this.#document.querySelector<HTMLElement>(selector);
  }

  #warnOnce(): void {
    if (!this.#warned) {
      this.#warned = true;
      this.#log.warn('The tab strip does not match the selectors, the gaps of hidden tabs stay open');
    }
  }

  #shrink(frame: HTMLElement, hiddenHeight: number): void {
    this.#frame = frame;
    const current = frame.style.getPropertyValue(MAX_HEIGHT);
    if (current !== this.#written) {
      this.#original = { value: current, priority: frame.style.getPropertyPriority(MAX_HEIGHT) };
    }
    const original = Number.parseFloat(this.#original?.value ?? '');
    if (hiddenHeight === 0 || !Number.isFinite(original)) {
      this.#restoreFrame();
      return;
    }
    this.#written = `${original - hiddenHeight}px`;
    frame.style.setProperty(MAX_HEIGHT, this.#written, 'important');
  }

  #restoreFrame(): void {
    const frame = this.#frame;
    const original = this.#original;
    if (frame !== null && original !== null && this.#written !== null) {
      frame.style.setProperty(MAX_HEIGHT, original.value, original.priority);
    }
    this.#written = null;
    this.#original = null;
  }

  #clear(): void {
    [...this.#shifted].forEach((slot) => this.#shift(slot, null));
    [...this.#collapsed].forEach((slot) => this.#collapse(slot, false));
    this.#restoreFrame();
  }

  static #read(slot: HTMLElement, collapsed: boolean): GapSlot {
    return {
      offset: Number.parseFloat(slot.style.getPropertyValue(OFFSET_PROPERTY)),
      height: Number.parseFloat(slot.style.getPropertyValue(HEIGHT_PROPERTY)),
      hidden: collapsed || slot.hasAttribute(HIDDEN_ATTRIBUTE),
    };
  }

  #shift(slot: HTMLElement, shift: number | null): void {
    if (shift === null || shift === 0) {
      if (this.#shifted.delete(slot)) {
        slot.style.removeProperty(SHIFT_PROPERTY);
      }
    } else {
      slot.style.setProperty(SHIFT_PROPERTY, `${shift}px`);
      this.#shifted.add(slot);
    }
  }
}
