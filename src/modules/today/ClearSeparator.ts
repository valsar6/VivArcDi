import type { SelectorCatalog } from '../../core/dom/SelectorCatalog.js';
import { ShortcutKeys } from '../../core/dom/ShortcutKeys.js';
import { watchSubtree } from '../../core/dom/KeptElement.js';
import type { SubtreeWatcher } from '../../core/dom/KeptElement.js';
import { FrameTask } from '../../core/support/FrameTask.js';
import type { FrameTiming } from '../../core/support/FrameTask.js';
import type { Logger } from '../../core/support/Logger.js';
import { TabSlot } from '../../core/tabs/TabSlot.js';
import { HIDDEN_ATTRIBUTE } from '../../shared/tabs/HiddenAttribute.js';
import { NO_TODAY_ATTRIBUTE, OWN_ROW_ATTRIBUTE, PINNED_LAST_ATTRIBUTE } from '../../shared/tabs/TabBarMarks.js';

export const CLEAR_ATTRIBUTE = 'data-vivarcdi-clear';
export const CLEAR_ROW_ATTRIBUTE = 'data-vivarcdi-clear-row';
export const CLEAR_LINE_ATTRIBUTE = 'data-vivarcdi-clear-line';

const CLEAR_HEIGHT = 13;
const MISSING_STRIP = 'The tab strip is missing: the Clear control is left to the archive panel';
const OFFSET_PROPERTY = '--PositionY';
const SHIFT_PROPERTY = '--vivarcdi-gap-shift';
const CLEAR_TARGET = `[${CLEAR_ATTRIBUTE}]`;
const SWALLOWED_EVENTS = ['pointerdown', 'mousedown', 'click'] as const;
const WATCHED_ATTRIBUTES = [HIDDEN_ATTRIBUTE, PINNED_LAST_ATTRIBUTE, 'style'];

export interface ClearSeparatorDependencies {
  /** The browser window document. */
  document: Document;
  /** Needs `tabStrip`, `pinnedTab` and `tabWrapper`; uses `browser` as the watched root. */
  selectors: SelectorCatalog;
  /** What a click on Clear does. */
  onClear: () => void;
  /** `navigator.platform`, to name the shortcut in the tooltip; empty means not macOS. */
  platform?: string;
  /** Reports a tab strip that does not match the selectors. */
  logger?: Pick<Logger, 'warn'>;
  /** Watches the tab bar for redraws, replaceable in tests. */
  watch?: SubtreeWatcher;
  /** Frame scheduling for the placement, replaceable in tests. */
  timing?: FrameTiming;
}

export class ClearSeparator {
  #deps: ClearSeparatorDependencies;
  #row: HTMLElement;
  #task: FrameTask;
  #unwatch: (() => void) | null = null;
  #warned = false;
  #onEvent = (event: Event): void => this.#handle(event);

  /**
   * The row VivArcDi owns above the Today tabs: it holds the Clear control and draws the separator line.
   * It lives in the tab strip but outside every pinned row and group, so the rules that hide pinned rows cannot collapse it.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: ClearSeparatorDependencies) {
    this.#deps = dependencies;
    this.#row = dependencies.document.createElement('div');
    this.#row.setAttribute(CLEAR_ROW_ATTRIBUTE, '');
    this.#row.setAttribute(OWN_ROW_ATTRIBUTE, '');
    this.#row.append(this.#button(dependencies.document));
    this.#task = new FrameTask(() => this.sync(), dependencies.timing);
  }

  /**
   * Places the row, starts watching the tab bar and takes the presses of the Clear control.
   */
  public start(): void {
    SWALLOWED_EVENTS.forEach((type) => this.#deps.document.addEventListener(type, this.#onEvent, true));
    const root = this.#element('browser') ?? this.#deps.document;
    this.#warned = false;
    this.#unwatch = (this.#deps.watch ?? watchSubtree(WATCHED_ATTRIBUTES))(root, () => this.#task.request());
    this.sync();
  }

  /**
   * Removes the row, the watcher and every listener.
   */
  public stop(): void {
    SWALLOWED_EVENTS.forEach((type) => this.#deps.document.removeEventListener(type, this.#onEvent, true));
    this.#unwatch?.();
    this.#unwatch = null;
    this.#task.cancel();
    this.#row.remove();
    this.#mark(false);
  }

  /**
   * Puts the row above the first Today tab, aligned with its offset and shift, and marks it to draw its line.
   */
  public sync(): void {
    const strip = this.#element('tabStrip');
    if (strip === null) {
      this.#row.remove();
      this.#mark(false);
      this.#warnMissing();
      return;
    }
    const slot = this.#firstTodaySlot(strip);
    if (slot === null) {
      this.#row.remove();
      this.#mark(true);
      return;
    }
    this.#mark(false);
    this.#place(strip, slot);
    if (!this.#row.hasAttribute(CLEAR_LINE_ATTRIBUTE)) {
      this.#row.setAttribute(CLEAR_LINE_ATTRIBUTE, '');
    }
  }

  #button(document: Document): HTMLButtonElement {
    const button = document.createElement('button');
    button.setAttribute('type', 'button');
    button.setAttribute(CLEAR_ATTRIBUTE, '');
    button.setAttribute('title', `Clear Today tabs ${ShortcutKeys.isMac(this.#deps.platform ?? '') ? '⇧⌘K' : 'Ctrl+Shift+K'}`);
    button.textContent = 'Clear';
    return button;
  }

  #firstTodaySlot(strip: HTMLElement): HTMLElement | null {
    const wrapper = this.#selector('tabWrapper');
    const pinned = this.#selector('pinnedTab');
    if (wrapper === null || pinned === null) {
      return null;
    }
    for (const child of [...strip.children] as HTMLElement[]) {
      if (child !== this.#row && ClearSeparator.#isToday(child, wrapper, pinned)) {
        return child;
      }
    }
    return null;
  }

  static #isToday(slot: HTMLElement, wrapper: string, pinned: string): boolean {
    return TabSlot.idOf(slot, wrapper) !== null && !slot.hasAttribute(HIDDEN_ATTRIBUTE) && !slot.matches(pinned) && slot.querySelector(pinned) === null;
  }

  #place(strip: HTMLElement, slot: HTMLElement): void {
    const placed = slot.style.getPropertyValue(OFFSET_PROPERTY) === '' ? (slot.firstElementChild as HTMLElement | null) ?? slot : slot;
    const offset = Number.parseFloat(placed.style.getPropertyValue(OFFSET_PROPERTY));
    if (!Number.isFinite(offset)) {
      this.#row.remove();
      return;
    }
    this.#write(OFFSET_PROPERTY, `${offset - CLEAR_HEIGHT}px`);
    this.#write(SHIFT_PROPERTY, `${Number.parseFloat(slot.style.getPropertyValue(SHIFT_PROPERTY)) || 0}px`);
    if (this.#row.parentElement !== strip || this.#row.nextElementSibling !== slot) {
      strip.insertBefore(this.#row, slot);
    }
  }

  #mark(empty: boolean): void {
    const browser = this.#element('browser');
    if (browser !== null && browser.hasAttribute(NO_TODAY_ATTRIBUTE) !== empty) {
      browser.toggleAttribute(NO_TODAY_ATTRIBUTE, empty);
    }
  }

  #write(name: string, value: string): void {
    if (this.#row.style.getPropertyValue(name) !== value) {
      this.#row.style.setProperty(name, value);
    }
  }

  #handle(event: Event): void {
    if ((event.target as Element | null)?.closest?.(CLEAR_TARGET) == null) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.type === 'click') {
      this.#deps.onClear();
    }
  }

  #element(name: string): HTMLElement | null {
    const selector = this.#selector(name);
    return selector === null ? null : this.#deps.document.querySelector<HTMLElement>(selector);
  }

  #selector(name: string): string | null {
    return this.#deps.selectors.has(name) ? this.#deps.selectors.get(name) : null;
  }

  #warnMissing(): void {
    if (!this.#warned) {
      this.#warned = true;
      this.#deps.logger?.warn(MISSING_STRIP);
    }
  }
}
