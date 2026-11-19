export interface PageHook {
  attach(): void;
  detach(): void;
}

/**
 * One capture-phase listener on the page's global object.
 */
export class PageListener<K extends keyof WindowEventMap> implements PageHook {
  #type: K;
  #listener: (event: WindowEventMap[K]) => void;

  constructor(type: K, listener: (event: WindowEventMap[K]) => void) {
    this.#type = type;
    this.#listener = listener;
  }

  public attach(): void {
    globalThis.addEventListener(this.#type, this.#listener, true);
  }

  public detach(): void {
    globalThis.removeEventListener(this.#type, this.#listener, true);
  }
}

type Slot = Record<symbol, PageHook | undefined>;

/**
 * Holds what a page script attached to the page, under one `Symbol.for` key on `globalThis`.
 */
export class PageInstall {
  #key: symbol;

  constructor(key: string) {
    this.#key = Symbol.for(key);
  }

  /**
   * Detaches the previous hook, attaches the new one and keeps it.
   *
   * @param hook What to attach to the page.
   */
  public replace(hook: PageHook): void {
    this.remove();
    hook.attach();
    this.#slot()[this.#key] = hook;
  }

  /**
   * Detaches the kept hook, if any, and forgets it.
   */
  public remove(): void {
    const slot = this.#slot();
    const hook = slot[this.#key];
    if (typeof hook?.detach === 'function') {
      hook.detach();
    }
    slot[this.#key] = undefined;
  }

  #slot(): Slot {
    return globalThis;
  }
}
