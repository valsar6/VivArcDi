import { TILE_ATTRIBUTE } from './FavoritesView.js';

export const HOVER_NAME_MS = 3000;
export const NAME_ATTRIBUTE = 'data-vivarcdi-tile-name';

const EDGE_PX = 8;
const CANCELLING_EVENTS = ['mousedown', 'contextmenu', 'dragstart', 'wheel'];

export interface HoverTimers {
  set(run: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

export interface TileHoverNameDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** The element the name is added to, read when the name is shown. */
  parent: () => Element;
  timers: HoverTimers;
}

export class TileHoverName {
  #deps: TileHoverNameDependencies;
  #timer: unknown = null;
  #tile: Element | null = null;
  #label: HTMLElement | null = null;

  /**
   * The name of a tile of the Favorites grid, shown below it once the pointer has rested on it
   * for three seconds. The native title of a tile is not used, so only this name shows.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: TileHoverNameDependencies) {
    this.#deps = dependencies;
  }

  /**
   * Listens on a grid.
   *
   * @param grid The element that holds the tiles.
   * @param textOf Gives the text to show for a tile element.
   * @returns The function that stops listening and removes the name.
   */
  public attach(grid: HTMLElement, textOf: (tile: HTMLElement) => string): () => void {
    const onOver = (event: Event): void => this.#over(event, textOf);
    const onOut = (event: Event): void => this.#out(event as MouseEvent);
    const onCancel = (): void => this.#cancel();
    grid.addEventListener('mouseover', onOver);
    grid.addEventListener('mouseout', onOut);
    CANCELLING_EVENTS.forEach((type) => grid.addEventListener(type, onCancel));
    return (): void => {
      grid.removeEventListener('mouseover', onOver);
      grid.removeEventListener('mouseout', onOut);
      CANCELLING_EVENTS.forEach((type) => grid.removeEventListener(type, onCancel));
      this.#cancel();
    };
  }

  #tileOf(target: EventTarget | null): Element | null {
    return (target as Element | null)?.closest?.(`[${TILE_ATTRIBUTE}]`) ?? null;
  }

  #over(event: Event, textOf: (tile: HTMLElement) => string): void {
    const tile = this.#tileOf(event.target);
    if (tile === null || tile === this.#tile) {
      return;
    }
    this.#cancel();
    this.#tile = tile;
    this.#timer = this.#deps.timers.set(() => this.#show(tile as HTMLElement, textOf), HOVER_NAME_MS);
  }

  #out(event: MouseEvent): void {
    if (this.#tile !== null && this.#tileOf(event.relatedTarget) !== this.#tile) {
      this.#cancel();
    }
  }

  #cancel(): void {
    if (this.#timer !== null) {
      this.#deps.timers.clear(this.#timer);
    }
    this.#timer = null;
    this.#tile = null;
    this.#label?.remove();
    this.#label = null;
  }

  #show(tile: HTMLElement, textOf: (tile: HTMLElement) => string): void {
    this.#timer = null;
    const label = this.#deps.document.createElement('div');
    label.setAttribute(NAME_ATTRIBUTE, '');
    label.textContent = textOf(tile);
    this.#deps.parent().append(label);
    this.#label = label;
    this.#place(label, tile);
  }

  #place(label: HTMLElement, tile: HTMLElement): void {
    const { innerWidth = 0, innerHeight = 0 } = this.#deps.document.defaultView ?? {};
    const anchor = tile.getBoundingClientRect();
    const size = label.getBoundingClientRect();
    const width = size.right - size.left;
    const below = anchor.bottom + EDGE_PX;
    const fitsBelow = below + size.height <= innerHeight - EDGE_PX;
    const left = Math.max(EDGE_PX, Math.min(anchor.left, innerWidth - width - EDGE_PX));
    label.style.setProperty('left', `${left}px`);
    label.style.setProperty('top', `${fitsBelow ? below : anchor.top - size.height - EDGE_PX}px`);
  }
}
