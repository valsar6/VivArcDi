export const SCROLLING_ATTRIBUTE = 'data-vivarcdi-scrolling';
export const SCROLL_MARK_MS = 800;

export interface ScrollTimers {
  set(run: () => void, delayMs: number): unknown;
  clear(handle: unknown): void;
}

const SYSTEM_TIMERS: ScrollTimers = {
  set: (run, delayMs) => setTimeout(run, delayMs),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export class ScrollMark {
  #document: Document;
  #tabBarSelector: string;
  #timers: ScrollTimers;
  #marked = new Map<Element, unknown>();
  #onScroll = (event: Event): void => this.#handle(event.target);

  /**
   * Marks the element that scrolls inside the tab bar while it scrolls and 800 ms after, so the
   * stylesheet can show the thin scroll bar only then.
   *
   * @param document The browser window document.
   * @param tabBarSelector Selector of Vivaldi's tab bar.
   * @param timers Delayed calls, replaceable in tests.
   */
  constructor(document: Document, tabBarSelector: string, timers: ScrollTimers = SYSTEM_TIMERS) {
    this.#document = document;
    this.#tabBarSelector = tabBarSelector;
    this.#timers = timers;
  }

  /**
   * Starts listening to scrolls. Scroll events do not bubble, so the listener captures them.
   */
  public start(): void {
    this.#document.addEventListener('scroll', this.#onScroll, true);
  }

  /**
   * Stops listening and removes every mark.
   */
  public stop(): void {
    this.#document.removeEventListener('scroll', this.#onScroll, true);
    for (const [element, handle] of this.#marked) {
      this.#timers.clear(handle);
      element.removeAttribute(SCROLLING_ATTRIBUTE);
    }
    this.#marked.clear();
  }

  #handle(target: EventTarget | null): void {
    const element = target as Element | null;
    if (typeof element?.closest !== 'function' || element.closest(this.#tabBarSelector) === null) {
      return;
    }
    this.#timers.clear(this.#marked.get(element));
    element.setAttribute(SCROLLING_ATTRIBUTE, '');
    this.#marked.set(
      element,
      this.#timers.set(() => {
        element.removeAttribute(SCROLLING_ATTRIBUTE);
        this.#marked.delete(element);
      }, SCROLL_MARK_MS),
    );
  }
}
