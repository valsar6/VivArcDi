export interface PinnedLists {
  /** The address keys of the pinned tabs on this computer, in tab order. */
  local: string[];
  /** The address keys in the sync store, in its order. */
  store: string[];
  /** The list this computer last agreed with the store, or null when it never synced. */
  base: string[] | null;
}

export class PinnedMerge {
  /**
   * Merges the pinned tabs of one workspace with a three-way comparison. A key that one side
   * added is kept, a key that one side dropped since the base is dropped, and the order of the
   * side that changed it wins; the store wins when both did. Without a base the result is the
   * store followed by the keys only this computer has, so nothing is lost when a computer joins.
   *
   * @param lists The three ordered lists of address keys.
   * @returns The ordered keys that this computer and the store both end up with.
   */
  public static merge({ local, store, base }: PinnedLists): string[] {
    if (base === null) {
      return PinnedMerge.#followed(store, local);
    }
    const dropped = new Set([...base.filter((key) => !local.includes(key)), ...base.filter((key) => !store.includes(key))]);
    const common = base.filter((key) => !dropped.has(key));
    const localMoved = !PinnedMerge.#inOrder(local, common);
    const storeMoved = !PinnedMerge.#inOrder(store, common);
    const [primary, secondary] = localMoved && !storeMoved ? [local, store] : [store, local];
    return PinnedMerge.#followed(PinnedMerge.#without(primary, dropped), PinnedMerge.#without(secondary, dropped));
  }

  static #followed(first: string[], second: string[]): string[] {
    return [...new Set([...first, ...second])];
  }

  static #without(keys: string[], dropped: Set<string>): string[] {
    return keys.filter((key) => !dropped.has(key));
  }

  static #inOrder(side: string[], common: string[]): boolean {
    const seen = side.filter((key) => common.includes(key));
    return seen.every((key, position) => key === common[position]);
  }
}
