export class GridLayout {
  #settings;
  #ResizeObserver;
  #observer = null;
  #strip = null;

  /**
   * Sizes the Favorites grid: picks the column count from the tab bar width,
   * and exposes the sizes to the stylesheet as CSS variables on the tab strip.
   *
   * @param {object} settings
   * @param {number} settings.minColumns Columns of a narrow tab bar.
   * @param {number} settings.tileMinWidth Narrowest tile before a column is dropped, in pixels.
   * @param {number} settings.tileHeight Tile height, in pixels.
   * @param {number} settings.gap Space between tiles, in pixels.
   * @param {typeof ResizeObserver} [ResizeObserverClass] Replaceable in tests.
   */
  constructor(settings, ResizeObserverClass = globalThis.ResizeObserver) {
    this.#settings = settings;
    this.#ResizeObserver = ResizeObserverClass;
  }

  /**
   * Computes how many tiles fit in a row. A wider tab bar gets more columns,
   * a narrow one never fewer than `minColumns`, as in Arc.
   *
   * @param {number} width Inner width of the tab strip, in pixels.
   * @param {{ minColumns: number, tileMinWidth: number, gap: number }} settings Grid sizes.
   * @returns {number} The column count.
   */
  static columnsFor(width, { minColumns, tileMinWidth, gap }) {
    if (!(width > 0)) {
      return minColumns;
    }
    return Math.max(minColumns, Math.floor((width + gap) / (tileMinWidth + gap)));
  }

  /**
   * Follows a tab strip: sets its variables and keeps the column count in step with its width.
   * Passing another strip, or null, releases the previous one.
   *
   * @param {HTMLElement | null} strip The tab strip laid out as a grid.
   */
  follow(strip) {
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
    this.#observer = new this.#ResizeObserver(([entry]) => this.#setColumns(entry.contentRect.width));
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
    for (const name of ['columns', 'tile-height', 'gap']) {
      this.#strip.style.removeProperty(`--vivarcdi-favorites-${name}`);
    }
    this.#strip = null;
  }

  #setColumns(width) {
    const columns = GridLayout.columnsFor(width, this.#settings);
    this.#strip.style.setProperty('--vivarcdi-favorites-columns', String(columns));
  }
}
