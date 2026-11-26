import { watchSubtree } from "../../core/dom/KeptElement.js";
import { FrameTask } from "../../core/support/FrameTask.js";
import { TabSlot } from "../../core/tabs/TabSlot.js";
import { HIDDEN_ATTRIBUTE } from "../../shared/tabs/HiddenAttribute.js";
import { NO_TODAY_ATTRIBUTE, OWN_ROW_ATTRIBUTE, PINNED_LAST_ATTRIBUTE } from "../../shared/tabs/TabBarMarks.js";
const CLEAR_ATTRIBUTE = "data-vivarcdi-clear";
const CLEAR_ROW_ATTRIBUTE = "data-vivarcdi-clear-row";
const CLEAR_LINE_ATTRIBUTE = "data-vivarcdi-clear-line";
const CLEAR_HEIGHT = 13;
const MISSING_STRIP = "The tab strip is missing: the Clear control is left to the archive panel";
const OFFSET_PROPERTY = "--PositionY";
const SHIFT_PROPERTY = "--vivarcdi-gap-shift";
const CLEAR_TARGET = `[${CLEAR_ATTRIBUTE}]`;
const SWALLOWED_EVENTS = ["pointerdown", "mousedown", "click"];
const WATCHED_ATTRIBUTES = [HIDDEN_ATTRIBUTE, PINNED_LAST_ATTRIBUTE, "style"];
class ClearSeparator {
  #deps;
  #row;
  #task;
  #unwatch = null;
  #warned = false;
  #onEvent = (event) => this.#handle(event);
  /**
   * The row VivArcDi owns above the Today tabs: it holds the Clear control and draws the separator
   * when no pinned row shows it. It lives in the tab strip but outside every pinned row and group,
   * so the rules that hide pinned rows cannot collapse it.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
    this.#row = dependencies.document.createElement("div");
    this.#row.setAttribute(CLEAR_ROW_ATTRIBUTE, "");
    this.#row.setAttribute(OWN_ROW_ATTRIBUTE, "");
    this.#row.append(ClearSeparator.#button(dependencies.document));
    this.#task = new FrameTask(() => this.sync(), dependencies.timing);
  }
  /**
   * Places the row, starts watching the tab bar and takes the presses of the Clear control.
   */
  start() {
    SWALLOWED_EVENTS.forEach((type) => this.#deps.document.addEventListener(type, this.#onEvent, true));
    const root = this.#element("browser") ?? this.#deps.document;
    this.#warned = false;
    this.#unwatch = (this.#deps.watch ?? watchSubtree(WATCHED_ATTRIBUTES))(root, () => this.#task.request());
    this.sync();
  }
  /**
   * Removes the row, the watcher and every listener.
   */
  stop() {
    SWALLOWED_EVENTS.forEach((type) => this.#deps.document.removeEventListener(type, this.#onEvent, true));
    this.#unwatch?.();
    this.#unwatch = null;
    this.#task.cancel();
    this.#row.remove();
    this.#mark(false);
  }
  /**
   * Puts the row above the first Today tab, aligned with its offset and shift, and updates the line.
   */
  sync() {
    const strip = this.#element("tabStrip");
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
    this.#line();
  }
  static #button(document) {
    const button = document.createElement("button");
    button.setAttribute("type", "button");
    button.setAttribute(CLEAR_ATTRIBUTE, "");
    button.setAttribute("title", "Archive the Today tabs of this workspace");
    button.textContent = "Clear";
    return button;
  }
  #firstTodaySlot(strip) {
    const wrapper = this.#selector("tabWrapper");
    const pinned = this.#selector("pinnedTab");
    if (wrapper === null || pinned === null) {
      return null;
    }
    for (const child of [...strip.children]) {
      if (child !== this.#row && ClearSeparator.#isToday(child, wrapper, pinned)) {
        return child;
      }
    }
    return null;
  }
  static #isToday(slot, wrapper, pinned) {
    return TabSlot.idOf(slot, wrapper) !== null && !slot.hasAttribute(HIDDEN_ATTRIBUTE) && !slot.matches(pinned) && slot.querySelector(pinned) === null;
  }
  #place(strip, slot) {
    const placed = slot.style.getPropertyValue(OFFSET_PROPERTY) === "" ? slot.firstElementChild ?? slot : slot;
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
  #mark(empty) {
    const browser = this.#element("browser");
    if (browser !== null && browser.hasAttribute(NO_TODAY_ATTRIBUTE) !== empty) {
      browser.toggleAttribute(NO_TODAY_ATTRIBUTE, empty);
    }
  }
  #line() {
    const marked = this.#deps.document.querySelector(`[${PINNED_LAST_ATTRIBUTE}]`);
    const visible = marked !== null && !marked.hasAttribute(HIDDEN_ATTRIBUTE);
    if (this.#row.hasAttribute(CLEAR_LINE_ATTRIBUTE) === visible) {
      this.#row.toggleAttribute(CLEAR_LINE_ATTRIBUTE, !visible);
    }
  }
  #write(name, value) {
    if (this.#row.style.getPropertyValue(name) !== value) {
      this.#row.style.setProperty(name, value);
    }
  }
  #handle(event) {
    if (event.target?.closest?.(CLEAR_TARGET) == null) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.type === "click") {
      this.#deps.onClear();
    }
  }
  #element(name) {
    const selector = this.#selector(name);
    return selector === null ? null : this.#deps.document.querySelector(selector);
  }
  #selector(name) {
    return this.#deps.selectors.has(name) ? this.#deps.selectors.get(name) : null;
  }
  #warnMissing() {
    if (!this.#warned) {
      this.#warned = true;
      this.#deps.logger?.warn(MISSING_STRIP);
    }
  }
}
export {
  CLEAR_ATTRIBUTE,
  CLEAR_LINE_ATTRIBUTE,
  CLEAR_ROW_ATTRIBUTE,
  ClearSeparator
};
