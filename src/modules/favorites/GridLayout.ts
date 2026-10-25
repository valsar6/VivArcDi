export interface GridSettings {
  /** Columns of a narrow tab bar. */
  minColumns: number;
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

  /**
   * Sizes the Favorites grid: picks the column count from the tab bar width,
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
   * Computes how many tiles fit in a row. A wider tab bar gets more columns,
   * a narrow one never fewer than `minColumns`, as in Arc.
   *
   * @param width Inner width of the tab strip, in pixels.
   * @param settings Grid sizes.
   * @returns The column count.
   */
  public static columnsFor(
    width: number,
    { minColumns, tileMinWidth, gap }: Pick<GridSettings, 'minColumns' | 'tileMinWidth' | 'gap'>,
  ): number {
    if (!(width > 0)) {
      return minColumns;
    }
    return Math.max(minColumns, Math.floor((width + gap) / (tileMinWidth + gap)));
  }

  /**
   * Follows a tab strip: sets its variables and keeps the column count in step with its width.
   * Passing another strip, or null, releases the previous one.
   *
   * @param strip The tab strip laid out as a grid.
   */
  public follow(strip: HTMLElement | null): void {
    if (strip === this.#strip) {
      return;
    }
    this.release();
    if (strip === null) {
      return;
    }
    this.#strip = strip;
    const { tileHeight, gap } = this.#settings;
    strip.style.setProperty('--vivarcdi-favorites-tile-height', `${tileHeight}px`);
    strip.style.setProperty('--vivarcdi-favorites-gap', `${gap}px`);
    this.#setColumns(strip.clientWidth);
    this.#observer = new this.#ResizeObserver(([entry]) => {
      if (entry !== undefined) {
        this.#setColumns(entry.contentRect.width);
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

  #setColumns(width: number): void {
    const columns = GridLayout.columnsFor(width, this.#settings);
    this.#strip?.style.setProperty('--vivarcdi-favorites-columns', String(columns));
  }
}
