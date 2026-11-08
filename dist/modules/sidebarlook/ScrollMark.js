const SCROLLING_ATTRIBUTE = "data-vivarcdi-scrolling";
const SCROLL_MARK_MS = 800;
const SYSTEM_TIMERS = {
  set: (run, delayMs) => setTimeout(run, delayMs),
  clear: (handle) => clearTimeout(handle)
};
class ScrollMark {
  #document;
  #tabBarSelector;
  #timers;
  #marked = /* @__PURE__ */ new Map();
  #onScroll = (event) => this.#handle(event.target);
  /**
   * Marks the element that scrolls inside the tab bar while it scrolls and 800 ms after, so the
   * stylesheet can show the thin scroll bar only then.
   *
   * @param document The browser window document.
   * @param tabBarSelector Selector of Vivaldi's tab bar.
   * @param timers Delayed calls, replaceable in tests.
   */
  constructor(document, tabBarSelector, timers = SYSTEM_TIMERS) {
    this.#document = document;
    this.#tabBarSelector = tabBarSelector;
    this.#timers = timers;
  }
  /**
   * Starts listening to scrolls. Scroll events do not bubble, so the listener captures them.
   */
  start() {
    this.#document.addEventListener("scroll", this.#onScroll, true);
  }
  /**
   * Stops listening and removes every mark.
   */
  stop() {
    this.#document.removeEventListener("scroll", this.#onScroll, true);
    for (const [element, handle] of this.#marked) {
      this.#timers.clear(handle);
      element.removeAttribute(SCROLLING_ATTRIBUTE);
    }
    this.#marked.clear();
  }
  #handle(target) {
    const element = target;
    if (typeof element?.closest !== "function" || element.closest(this.#tabBarSelector) === null) {
      return;
    }
    this.#timers.clear(this.#marked.get(element));
    element.setAttribute(SCROLLING_ATTRIBUTE, "");
    this.#marked.set(
      element,
      this.#timers.set(() => {
        element.removeAttribute(SCROLLING_ATTRIBUTE);
        this.#marked.delete(element);
      }, SCROLL_MARK_MS)
    );
  }
}
export {
  SCROLLING_ATTRIBUTE,
  SCROLL_MARK_MS,
  ScrollMark
};
