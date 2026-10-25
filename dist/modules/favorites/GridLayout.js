class GridLayout {
  #settings;
  #ResizeObserver;
  #observer = null;
  #strip = null;
  #tiles = 0;
  #width = 0;
  /**
   * Sizes the Favorites grid: picks the column count from the tile count and the tab bar width,
   * and exposes the sizes to the stylesheet as CSS variables on the tab strip.
   *
   * @param settings Grid sizes.
   * @param ResizeObserverClass Replaceable in tests.
   */
  constructor(settings, ResizeObserverClass = globalThis.ResizeObserver) {
    this.#settings = settings;
    this.#ResizeObserver = ResizeObserverClass;
  }
  /**
   * Computes the columns of a row, as in Arc: up to `maxColumns`, fewer when there are fewer
   * tiles so they stretch to fill the row, and fewer when the tab bar is too narrow for them.
   *
   * @param width Inner width of the tab strip, in pixels; 0 when not measured yet.
   * @param tiles How many tiles the grid holds.
   * @param settings Grid sizes.
   * @returns The column count, at least 1.
   */
  static columnsFor(width, tiles, { maxColumns, tileMinWidth, gap }) {
    const fitting = width > 0 ? Math.floor((width + gap) / (tileMinWidth + gap)) : maxColumns;
    return Math.max(1, Math.min(maxColumns, tiles, fitting));
  }
  /**
   * Follows a tab strip: sets its variables and keeps the column count in step with its width
   * and its tile count. Passing another strip, or null, releases the previous one.
   *
   * @param strip The tab strip laid out as a grid.
   * @param tiles How many tiles the strip holds.
   */
  follow(strip, tiles = 0) {
    this.#tiles = tiles;
    if (strip === this.#strip) {
      this.#setColumns();
      return;
    }
    this.release();
    if (strip === null) {
      return;
    }
    this.#strip = strip;
    this.#width = strip.clientWidth;
    const { tileHeight, gap } = this.#settings;
    strip.style.setProperty("--vivarcdi-favorites-tile-height", `${tileHeight}px`);
    strip.style.setProperty("--vivarcdi-favorites-gap", `${gap}px`);
    this.#setColumns();
    this.#observer = new this.#ResizeObserver(([entry]) => {
      if (entry !== void 0) {
        this.#width = entry.contentRect.width;
        this.#setColumns();
      }
    });
    this.#observer.observe(strip);
  }
  /**
   * Stops following the current strip and removes its variables.
   */
  release() {
    this.#observer?.disconnect();
    this.#observer = null;
    if (this.#strip === null) {
      return;
    }
    for (const name of ["columns", "tile-height", "gap"]) {
      this.#strip.style.removeProperty(`--vivarcdi-favorites-${name}`);
    }
    this.#strip = null;
  }
  #setColumns() {
    const columns = GridLayout.columnsFor(this.#width, this.#tiles, this.#settings);
    this.#strip?.style.setProperty("--vivarcdi-favorites-columns", String(columns));
  }
}
export {
  GridLayout
};
