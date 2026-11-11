import { FrameTask } from "./FrameTask.js";
const ANCHOR_ATTRIBUTE = "data-vivarcdi-anchor";
const watchTree = (target, onChange) => {
  const observer = new MutationObserver(onChange);
  observer.observe(target, { childList: true, subtree: true });
  return () => observer.disconnect();
};
class TabBarAnchor {
  static #instances = /* @__PURE__ */ new WeakMap();
  #document;
  #selector;
  #watch;
  #task;
  #entries = [];
  #host = null;
  #unwatch = null;
  /**
   * The place above Vivaldi's tab list where VivArcDi draws its own sections. It is a sibling of
   * the tab list, never inside it, because Vivaldi rebuilds the list and would move anything
   * drawn there. Use `of`, so that the modules share one host.
   *
   * @param document The browser window document.
   * @param selector Selector of the tab list's container, the element the host is put before.
   * @param watch Reports added and removed nodes anywhere in the document, replaceable in tests. The
   *   whole document is watched because a change of layout makes Vivaldi build a new container for
   *   the tab list, and a watcher on the old one would never fire again.
   * @param timing Frame scheduling for the repairs, replaceable in tests.
   */
  constructor(document, selector, watch = watchTree, timing = {}) {
    this.#document = document;
    this.#selector = selector;
    this.#watch = watch;
    this.#task = new FrameTask(() => this.#sync(), timing);
  }
  /**
   * @param document The browser window document.
   * @param selector Selector of the tab list's container.
   * @returns The anchor shared by every module of that document.
   */
  static of(document, selector) {
    const existing = TabBarAnchor.#instances.get(document);
    if (existing !== void 0) {
      return existing;
    }
    const anchor = new TabBarAnchor(document, selector);
    TabBarAnchor.#instances.set(document, anchor);
    return anchor;
  }
  /**
   * Puts an element in the host, after those with a smaller order.
   *
   * @param element The element to show.
   * @param order Its place among the sections: the Favorites grid is 10, the space header 15, the folders 20.
   * @returns A function that removes the element again.
   * @throws {Error} When the tab list is not found.
   */
  add(element, order) {
    const entry = { element, order };
    this.#entries = [...this.#entries, entry].sort((a, b) => a.order - b.order);
    try {
      this.#sync(true);
    } catch (error) {
      this.#entries = this.#entries.filter((candidate) => candidate !== entry);
      throw error;
    }
    return () => {
      element.remove();
      this.#entries = this.#entries.filter((candidate) => candidate !== entry);
      if (this.#entries.length === 0) {
        this.#dispose();
      }
    };
  }
  #sync(strict = false) {
    if (this.#entries.length === 0) {
      return;
    }
    const list = this.#document.querySelector(this.#selector);
    if (list?.parentElement == null) {
      if (strict) {
        throw new Error(`Element not found: ${this.#selector}`);
      }
      return;
    }
    const host = this.#hostBefore(list);
    const wanted = this.#entries.map(({ element }) => element);
    if (wanted.some((element, position) => host.children[position] !== element)) {
      host.append(...wanted);
    }
    this.#watchDocument();
  }
  #hostBefore(list) {
    const host = this.#host ?? this.#document.createElement("div");
    host.setAttribute(ANCHOR_ATTRIBUTE, "");
    if (host.nextElementSibling !== list || host.parentElement !== list.parentElement) {
      list.before(host);
    }
    this.#host = host;
    return host;
  }
  #watchDocument() {
    this.#unwatch ??= this.#watch(this.#document, () => this.#task.request());
  }
  #dispose() {
    this.#task.cancel();
    this.#unwatch?.();
    this.#unwatch = null;
    this.#host?.remove();
    this.#host = null;
  }
}
export {
  TabBarAnchor
};
