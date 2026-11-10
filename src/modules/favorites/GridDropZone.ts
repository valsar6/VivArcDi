import { TILE_ATTRIBUTE } from './FavoritesView.js';

export const GAP_ATTRIBUTE = 'data-vivarcdi-drop-gap';
export const TAB_ENTRIES_TYPE = 'vivaldi/x-tab-entries';

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
}

type DragHandler = (event: Event) => void;

export class GridDropZone {
  #deps: GridDropZoneDependencies;
  #gap: HTMLElement | null = null;
  #onDragOver: DragHandler = (event) => this.#over(event as DragEvent);
  #onDrop: DragHandler = (event) => this.#drop(event as DragEvent);
  #onLeave: DragHandler = () => this.clearGap();
  #dropped: ((target: GridTarget) => void) | null = null;

  /**
   * The grid of the Favorites as a place to drop a tab: it tells what is under a point, shows the
   * gap where the new tile will go, and takes the HTML5 `dragover` and `drop` that carry
   * `vivaldi/x-tab-entries` for the cases when Vivaldi does send them.
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
    if (GridDropZone.#inside(this.#deps.below(), x, y)) {
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
   * Shows the gap where a tab will land, or removes it.
   *
   * @param target The place, or null to remove the gap.
   */
  public showGap(target: GridTarget | null): void {
    const grid = this.#deps.grid();
    if (target === null || grid === null) {
      this.clearGap();
      return;
    }
    const before = GridDropZone.#tiles(grid).find((tile) => target.beforeId !== null && tile.getAttribute(TILE_ATTRIBUTE) === target.beforeId) ?? null;
    this.#place(this.#gap ?? this.#createGap(), grid, before);
  }

  /**
   * Removes the gap.
   */
  public clearGap(): void {
    this.#gap?.remove();
  }

  /**
   * Starts taking the HTML5 drags of tabs over the grid.
   *
   * @param dropped Called when a tab is dropped over the grid, with the place.
   */
  public listen(dropped: (target: GridTarget) => void): void {
    this.#dropped = dropped;
    const { document } = this.#deps;
    document.addEventListener('dragover', this.#onDragOver, true);
    document.addEventListener('drop', this.#onDrop, true);
    document.addEventListener('dragleave', this.#onLeave, true);
    document.addEventListener('dragend', this.#onLeave, true);
  }

  /**
   * Stops taking drags and removes the gap.
   */
  public unlisten(): void {
    const { document } = this.#deps;
    document.removeEventListener('dragover', this.#onDragOver, true);
    document.removeEventListener('drop', this.#onDrop, true);
    document.removeEventListener('dragleave', this.#onLeave, true);
    document.removeEventListener('dragend', this.#onLeave, true);
    this.#dropped = null;
    this.clearGap();
  }

  #over(event: DragEvent): void {
    const target = GridDropZone.#carriesTab(event) ? this.at(event.clientX, event.clientY) : null;
    if (target === null) {
      this.clearGap();
      return;
    }
    event.preventDefault();
    this.showGap(target);
  }

  #drop(event: DragEvent): void {
    const target = GridDropZone.#carriesTab(event) ? this.at(event.clientX, event.clientY) : null;
    this.clearGap();
    if (target !== null) {
      event.preventDefault();
      this.#dropped?.(target);
    }
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

  static #carriesTab(event: DragEvent): boolean {
    return Array.from(event.dataTransfer?.types ?? []).includes(TAB_ENTRIES_TYPE);
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
