import { FrameTask } from './FrameTask.js';
import type { FrameTiming } from './FrameTask.js';

export type AnchorWatcher = (target: Node, onChange: () => void) => () => void;

interface Entry {
  element: HTMLElement;
  order: number;
}

const ANCHOR_ATTRIBUTE = 'data-vivarcdi-anchor';

const watchChildren: AnchorWatcher = (target, onChange) => {
  const observer = new MutationObserver(onChange);
  observer.observe(target, { childList: true });
  return () => observer.disconnect();
};

export class TabBarAnchor {
  static #instances = new WeakMap<Document, TabBarAnchor>();

  #document: Document;
  #selector: string;
  #watch: AnchorWatcher;
  #task: FrameTask;
  #entries: Entry[] = [];
  #host: HTMLElement | null = null;
  #unwatch: (() => void) | null = null;

  /**
   * The place above Vivaldi's tab list where VivArcDi draws its own sections. It is a sibling of
   * the tab list, never inside it, because Vivaldi rebuilds the list and would move anything
   * drawn there. Use `of`, so that the modules share one host.
   *
   * @param document The browser window document.
   * @param selector Selector of the tab list's container, the element the host is put before.
   * @param watch Reports changes among the children of the tab list's parent, replaceable in tests.
   * @param timing Frame scheduling for the repairs, replaceable in tests.
   */
  constructor(document: Document, selector: string, watch: AnchorWatcher = watchChildren, timing: FrameTiming = {}) {
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
  public static of(document: Document, selector: string): TabBarAnchor {
    const existing = TabBarAnchor.#instances.get(document);
    if (existing !== undefined) {
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
   * @param order Its place among the sections: the Favorites grid is 10, the folders 20.
   * @returns A function that removes the element again.
   * @throws {Error} When the tab list is not found.
   */
  public add(element: HTMLElement, order: number): () => void {
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

  #sync(strict = false): void {
    if (this.#entries.length === 0) {
      return;
    }
    const list = this.#document.querySelector<HTMLElement>(this.#selector);
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
    this.#watchParent(list.parentElement);
  }

  #hostBefore(list: HTMLElement): HTMLElement {
    const host = this.#host ?? this.#document.createElement('div');
    host.setAttribute(ANCHOR_ATTRIBUTE, '');
    if (host.nextElementSibling !== list || host.parentElement !== list.parentElement) {
      list.before(host);
    }
    this.#host = host;
    return host;
  }

  #watchParent(parent: Node): void {
    this.#unwatch ??= this.#watch(parent, () => this.#task.request());
  }

  #dispose(): void {
    this.#task.cancel();
    this.#unwatch?.();
    this.#unwatch = null;
    this.#host?.remove();
    this.#host = null;
  }
}
