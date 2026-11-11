import { OPEN_ATTRIBUTE } from './FirstTileArea.js';
import { TILE_ATTRIBUTE } from './FavoritesView.js';

export const GAP_ATTRIBUTE = 'data-vivarcdi-drop-gap';

/** Where a dragged tab lands: before the Favorite with this id, or at the end of the grid when null. */
export interface GridTarget {
  beforeId: string | null;
}

export interface GridDropZoneDependencies {
  document: Document;
  /** The grid of the Favorites, when it is in the window. */
  grid: () => HTMLElement | null;
  /** The grid of the pinned tiles right under it, when it is in the window; it counts as the end of the first, which is created by the drop when the folder is missing. */
  below: () => HTMLElement | null;
  /** The area of the first tile, when it is in the window because no tile is shown. */
  empty: () => HTMLElement | null;
}

export class GridDropZone {
  #deps: GridDropZoneDependencies;
  #gap: HTMLElement | null = null;

  /**
   * The grid of the Favorites as a place to drop a page: it tells what is under a point and shows
   * the gap where the new tile will go.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: GridDropZoneDependencies) {
    this.#deps = dependencies;
  }

  /**
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   * @returns The place under the point, or null when the point is outside the grid.
   */
  public at(x: number, y: number): GridTarget | null {
    if (GridDropZone.#inside(this.#deps.below(), x, y) || GridDropZone.#inside(this.#deps.empty(), x, y)) {
      return { beforeId: null };
    }
    const grid = this.#deps.grid();
    if (grid === null || !GridDropZone.#inside(grid, x, y)) {
      return null;
    }
    const tile = GridDropZone.#tiles(grid).find((candidate) => GridDropZone.#reaches(candidate, x, y));
    return { beforeId: tile?.getAttribute(TILE_ATTRIBUTE) ?? null };
  }

  /**
   * Shows the gap where a page will land, or removes it.
   *
   * @param target The place, or null to remove the gap.
   */
  public mark(target: GridTarget | null): void {
    const grid = this.#deps.grid();
    const empty = this.#deps.empty();
    if (target !== null && grid === null && empty !== null) {
      empty.setAttribute(OPEN_ATTRIBUTE, '');
      return;
    }
    if (target === null || grid === null) {
      this.clear();
      return;
    }
    const before = GridDropZone.#tiles(grid).find((tile) => target.beforeId !== null && tile.getAttribute(TILE_ATTRIBUTE) === target.beforeId) ?? null;
    this.#place(this.#gap ?? this.#createGap(), grid, before);
  }

  /**
   * Removes the gap.
   */
  public clear(): void {
    this.#gap?.remove();
    this.#deps.empty()?.removeAttribute(OPEN_ATTRIBUTE);
  }

  #place(gap: HTMLElement, grid: HTMLElement, before: HTMLElement | null): void {
    if (gap.parentElement === grid && gap.nextElementSibling === before) {
      return;
    }
    if (before === null) {
      grid.append(gap);
    } else {
      before.before(gap);
    }
  }

  #createGap(): HTMLElement {
    const gap = this.#deps.document.createElement('div');
    gap.setAttribute(GAP_ATTRIBUTE, '');
    this.#gap = gap;
    return gap;
  }

  static #tiles(grid: HTMLElement): HTMLElement[] {
    return Array.from(grid.children).filter((child): child is HTMLElement => child.hasAttribute(TILE_ATTRIBUTE));
  }

  static #reaches(tile: HTMLElement, x: number, y: number): boolean {
    const { right, top, bottom } = tile.getBoundingClientRect();
    const inRow = y >= top && y < bottom;
    return (inRow && x < right) || y < top;
  }

  static #inside(element: HTMLElement | null, x: number, y: number): boolean {
    if (element === null) {
      return false;
    }
    const { left, right, top, bottom } = element.getBoundingClientRect();
    return x >= left && x < right && y >= top && y < bottom;
  }
}
