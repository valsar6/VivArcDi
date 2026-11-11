export type LinkDropTarget = object;

/** A page that becomes a link: a tab that is open, or only a title and an address. */
export type LinkPage = { tab: chrome.tabs.Tab } | { title: string; url: string };

export interface LinkTargets {
  /** The place for a link under a point of the window, or null. */
  at(x: number, y: number): LinkDropTarget | null;
  /** Marks a place while a page is dragged over it; null unmarks. */
  mark(target: LinkDropTarget | null): void;
  /** Removes every mark. */
  clear(): void;
  /** The place at the end of the root of the workspace. */
  end(): LinkDropTarget | null;
  /** Adds the page as a link at the place; resolves to whether a link was added. */
  drop(target: LinkDropTarget, page: LinkPage): Promise<boolean>;
}

export class LinkDropZone implements LinkTargets {
  static #instances = new WeakMap<object, LinkDropZone>();

  #targets: LinkTargets | null = null;

  /**
   * The places where a dragged page can become a link of the workspace, shared so that no module
   * calls another: the folders section registers its places, and whoever drags a page asks.
   *
   * @param scope Usually the browser window document; the same scope gives the same zone.
   * @returns The zone shared by every module of that scope.
   */
  public static of(scope: object): LinkDropZone {
    const existing = LinkDropZone.#instances.get(scope);
    if (existing !== undefined) {
      return existing;
    }
    const created = new LinkDropZone();
    LinkDropZone.#instances.set(scope, created);
    return created;
  }

  /**
   * @returns Whether a section has registered its places.
   */
  public get available(): boolean {
    return this.#targets !== null;
  }

  /**
   * @param targets The places of a section.
   * @returns A function that removes them, if they are still the registered ones.
   */
  public register(targets: LinkTargets): () => void {
    this.#targets = targets;
    return () => {
      if (this.#targets === targets) {
        this.#targets = null;
      }
    };
  }

  /**
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   * @returns The place under the point, or null when there is none or nothing is registered.
   */
  public at(x: number, y: number): LinkDropTarget | null {
    return this.#targets?.at(x, y) ?? null;
  }

  /**
   * @param target The place to mark, or null to unmark.
   */
  public mark(target: LinkDropTarget | null): void {
    this.#targets?.mark(target);
  }

  /**
   * Removes the marks.
   */
  public clear(): void {
    this.#targets?.clear();
  }

  /**
   * @returns The place at the end of the workspace favorites, or null when nothing is registered.
   */
  public end(): LinkDropTarget | null {
    return this.#targets?.end() ?? null;
  }

  /**
   * @param target A place given by `at`.
   * @param page The page to add there.
   * @returns Whether a link was added; false when nothing is registered.
   */
  public async drop(target: LinkDropTarget, page: LinkPage): Promise<boolean> {
    return (await this.#targets?.drop(target, page)) ?? false;
  }
}
