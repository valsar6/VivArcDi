import type { MenuItem } from './ContextMenu.js';

export type SpaceMenuProvider = () => MenuItem[];

export class SpaceMenuItems {
  static #instances = new WeakMap<object, SpaceMenuItems>();

  #providers = new Set<SpaceMenuProvider>();

  /**
   * The items that other modules add to the menu of the space header, so that no module calls
   * another. The header asks for the items each time it opens the menu.
   *
   * @param scope Usually the browser window document; the same scope gives the same registry.
   * @returns The registry shared by every module of that scope.
   */
  public static of(scope: object): SpaceMenuItems {
    const existing = SpaceMenuItems.#instances.get(scope);
    if (existing !== undefined) {
      return existing;
    }
    const created = new SpaceMenuItems();
    SpaceMenuItems.#instances.set(scope, created);
    return created;
  }

  /**
   * @param provider Gives the items to add, called each time the menu opens.
   * @returns A function that removes the provider.
   */
  public add(provider: SpaceMenuProvider): () => void {
    this.#providers.add(provider);
    return () => this.#providers.delete(provider);
  }

  /**
   * @returns The items of every provider, in the order the providers were added.
   */
  public items(): MenuItem[] {
    return [...this.#providers].flatMap((provider) => provider());
  }
}
