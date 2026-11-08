class TileSourceChoice {
  /**
   * Chooses where the Favorites come from: the first source that has tiles, so the bookmark folder
   * wins over the pinned tabs while it holds links, and an empty or missing folder gives way.
   *
   * @param sources The sources, by priority.
   * @returns The chosen source, or null when none has tiles.
   */
  static of(sources) {
    return sources.find((source) => source.count > 0) ?? null;
  }
}
export {
  TileSourceChoice
};
