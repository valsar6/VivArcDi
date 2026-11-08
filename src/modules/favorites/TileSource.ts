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
