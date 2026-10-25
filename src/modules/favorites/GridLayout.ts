export interface GridSettings {
  /** Most columns in a row, whatever the tab bar width. */
  maxColumns: number;
  /** Narrowest tile before a column is dropped, in pixels. */
  tileMinWidth: number;
  /** Tile height, in pixels. */
  tileHeight: number;
  /** Space between tiles, in pixels. */
  gap: number;
}

export class GridLayout {
  #settings: GridSettings;
  #ResizeObserver: typeof ResizeObserver;
  #observer: ResizeObserver | null = null;
  #strip: HTMLElement | null = null;
  #tiles = 0;
  #width = 0;

  /**
   * Sizes the Favorites grid: picks the column count from the tile count and the tab bar width,
   * and exposes the sizes to the stylesheet as CSS variables on the tab strip.
   *
   * @param settings Grid sizes.
   * @param ResizeObserverClass Replaceable in tests.
   */
  constructor(settings: GridSettings, ResizeObserverClass: typeof ResizeObserver = globalThis.ResizeObserver) {
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
  public static columnsFor(
    width: number,
    tiles: number,
    { maxColumns, tileMinWidth, gap }: Pick<GridSettings, 'maxColumns' | 'tileMinWidth' | 'gap'>,
  ): number {
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
  public follow(strip: HTMLElement | null, tiles = 0): void {
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
    strip.style.setProperty('--vivarcdi-favorites-tile-height', `${tileHeight}px`);
    strip.style.setProperty('--vivarcdi-favorites-gap', `${gap}px`);
    this.#setColumns();
    this.#observer = new this.#ResizeObserver(([entry]) => {
      if (entry !== undefined) {
        this.#width = entry.contentRect.width;
        this.#setColumns();
      }
    });
    this.#observer.observe(strip);
  }

  /**
   * Stops following the current strip and removes its variables.
   */
  public release(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    if (this.#strip === null) {
      return;
    }
    for (const name of ['columns', 'tile-height', 'gap']) {
      this.#strip.style.removeProperty(`--vivarcdi-favorites-${name}`);
    }
    this.#strip = null;
  }

  #setColumns(): void {
    const columns = GridLayout.columnsFor(this.#width, this.#tiles, this.#settings);
    this.#strip?.style.setProperty('--vivarcdi-favorites-columns', String(columns));
  }
}
