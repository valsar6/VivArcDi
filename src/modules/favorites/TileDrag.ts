import { TILE_ATTRIBUTE } from './FavoritesView.js';

export const DRAGGING_ATTRIBUTE = 'data-vivarcdi-dragging';

export interface TileDragDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** The grid of the Favorites, when it is in the window; only its tiles are followed. */
  grid: () => HTMLElement | null;
  /** Called while a tile is dragged, with its Favorite and the position of the pointer. */
  onMove: (favoriteId: string, x: number, y: number) => void;
  /** Called when the button is released after a drag, with the Favorite and the position of the pointer. */
  onDrop: (favoriteId: string, x: number, y: number) => void;
  /** Called when the drag ends, dropped or not. */
  onEnd: () => void;
}

interface Press {
  tile: HTMLElement;
  favoriteId: string;
  x: number;
  y: number;
  dragging: boolean;
}

const DRAG_DISTANCE_PX = 6;
const PRIMARY_BUTTON = 0;

export class TileDrag {
  #deps: TileDragDependencies;
  #press: Press | null = null;
  #onDown = (event: Event): void => this.#down(event as MouseEvent);
  #onMove = (event: Event): void => this.#move(event as MouseEvent);
  #onUp = (event: Event): void => this.#up(event as MouseEvent);
  #onClick = (event: Event): void => this.#swallow(event);

  /**
   * Follows a tile of the Favorites grid being moved with the mouse: the button goes down on the
   * tile, the pointer moves more than a few pixels, and the button goes up somewhere. The tile is
   * dimmed while it is dragged, and the click that follows the release is swallowed so the tile
   * does not open.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: TileDragDependencies) {
    this.#deps = dependencies;
  }

  /**
   * Starts listening, in the capture phase.
   */
  public attach(): void {
    const { document } = this.#deps;
    document.addEventListener('mousedown', this.#onDown, true);
    document.addEventListener('mousemove', this.#onMove, true);
    document.addEventListener('mouseup', this.#onUp, true);
  }

  /**
   * Stops listening and forgets a drag in progress.
   */
  public detach(): void {
    const { document } = this.#deps;
    document.removeEventListener('mousedown', this.#onDown, true);
    document.removeEventListener('mousemove', this.#onMove, true);
    document.removeEventListener('mouseup', this.#onUp, true);
    document.removeEventListener('click', this.#onClick, true);
    this.#end();
  }

  #down(event: MouseEvent): void {
    this.#deps.document.removeEventListener('click', this.#onClick, true);
    this.#press = null;
    const tile = event.button === PRIMARY_BUTTON ? this.#tileOf(event.target) : null;
    const favoriteId = tile?.getAttribute(TILE_ATTRIBUTE) ?? null;
    if (tile !== null && favoriteId !== null) {
      this.#press = { tile, favoriteId, x: event.clientX, y: event.clientY, dragging: false };
    }
  }

  #move(event: MouseEvent): void {
    const press = this.#press;
    if (press === null) {
      return;
    }
    if (event.buttons === 0) {
      this.#end();
      return;
    }
    if (!press.dragging && Math.hypot(event.clientX - press.x, event.clientY - press.y) > DRAG_DISTANCE_PX) {
      press.dragging = true;
      press.tile.setAttribute(DRAGGING_ATTRIBUTE, '');
    }
    if (press.dragging) {
      this.#deps.onMove(press.favoriteId, event.clientX, event.clientY);
    }
  }

  #up(event: MouseEvent): void {
    const press = this.#press;
    if (press?.dragging === true) {
      this.#deps.document.addEventListener('click', this.#onClick, true);
      this.#deps.onDrop(press.favoriteId, event.clientX, event.clientY);
    }
    this.#end();
  }

  #end(): void {
    const press = this.#press;
    this.#press = null;
    press?.tile.removeAttribute(DRAGGING_ATTRIBUTE);
    if (press?.dragging === true) {
      this.#deps.onEnd();
    }
  }

  #swallow(event: Event): void {
    this.#deps.document.removeEventListener('click', this.#onClick, true);
    event.preventDefault();
    event.stopPropagation();
  }

  #tileOf(target: EventTarget | null): HTMLElement | null {
    const tile = (target as Element | null)?.closest?.(`[${TILE_ATTRIBUTE}]`);
    const grid = this.#deps.grid();
    return tile != null && grid !== null && tile.parentElement === grid ? (tile as HTMLElement) : null;
  }
}
