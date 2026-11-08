export interface TileSource {
  /** How many tiles the source shows. */
  readonly count: number;
  /**
   * Shows or hides the tiles above the tab list.
   *
   * @param visible Whether the vertical tab bar is shown and this source is the one chosen.
   * @returns The grid element when it is in place, otherwise null.
   */
  place(visible: boolean): HTMLElement | null;
}

export class TileSourceChoice {
  /**
   * Chooses where the Favorites come from: the first source that has tiles, so the bookmark folder
   * wins over the pinned tabs while it holds links, and an empty or missing folder gives way.
   *
   * @param sources The sources, by priority.
   * @returns The chosen source, or null when none has tiles.
   */
  public static of<Source extends TileSource>(sources: readonly Source[]): Source | null {
    return sources.find((source) => source.count > 0) ?? null;
  }
}
