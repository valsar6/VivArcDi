import type { LinkPage } from './LinkDropZone.js';

export type FavoriteDropTarget = object;

/** A page that becomes a Favorite: a tab that is open, or only a title and an address. */
export type FavoritePage = LinkPage;

export interface FavoriteTargets {
  /** The place for a Favorite under a point of the window, or null. */
  at(x: number, y: number): FavoriteDropTarget | null;
  /** Marks a place while a page is dragged over it; null unmarks. */
  mark(target: FavoriteDropTarget | null): void;
  /** Removes every mark. */
  clear(): void;
  /** The place at the end of the grid. */
  end(): FavoriteDropTarget | null;
  /** Adds the page as a Favorite at the place; resolves to whether a Favorite was added. */
  drop(target: FavoriteDropTarget, page: FavoritePage): Promise<boolean>;
}

export class FavoriteDropZone implements FavoriteTargets {
  static #instances = new WeakMap<object, FavoriteDropZone>();

  #targets: FavoriteTargets | null = null;

  /**
   * The places where a dragged page can become a Favorite, shared so that no module calls
   * another: the Favorites register their grid, and whoever drags a page asks. It mirrors
   * `LinkDropZone`.
   *
   * @param scope Usually the browser window document; the same scope gives the same zone.
   * @returns The zone shared by every module of that scope.
   */
  public static of(scope: object): FavoriteDropZone {
    const existing = FavoriteDropZone.#instances.get(scope);
    if (existing !== undefined) {
      return existing;
    }
    const created = new FavoriteDropZone();
    FavoriteDropZone.#instances.set(scope, created);
    return created;
  }

  /**
   * @returns Whether the Favorites have registered their grid.
   */
  public get available(): boolean {
    return this.#targets !== null;
  }

  /**
   * @param targets The places of the Favorites.
   * @returns A function that removes them, if they are still the registered ones.
   */
  public register(targets: FavoriteTargets): () => void {
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
  public at(x: number, y: number): FavoriteDropTarget | null {
    return this.#targets?.at(x, y) ?? null;
  }

  /**
   * @param target The place to mark, or null to unmark.
   */
  public mark(target: FavoriteDropTarget | null): void {
    this.#targets?.mark(target);
  }

  /**
   * Removes the marks.
   */
  public clear(): void {
    this.#targets?.clear();
  }

  /**
   * @returns The place at the end of the grid, or null when nothing is registered.
   */
  public end(): FavoriteDropTarget | null {
    return this.#targets?.end() ?? null;
  }

  /**
   * @param target A place given by `at`.
   * @param page The page to add there.
   * @returns Whether a Favorite was added; false when nothing is registered.
   */
  public async drop(target: FavoriteDropTarget, page: FavoritePage): Promise<boolean> {
    return (await this.#targets?.drop(target, page)) ?? false;
  }
}
