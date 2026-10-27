import type { Favorite } from './FavoritesFolder.js';
import type { TileState } from './FavoriteStates.js';

export const TILES_ATTRIBUTE = 'data-vivarcdi-tiles';
export const TILE_ATTRIBUTE = 'data-vivarcdi-tile';
export const CURRENT_ATTRIBUTE = 'data-vivarcdi-current';
export const DIMMED_ATTRIBUTE = 'data-vivarcdi-unloaded';
export const AWAY_ATTRIBUTE = 'data-vivarcdi-away';

const MIDDLE_BUTTON = 1;
const PRIMARY_BUTTON = 0;

export interface TileActions {
  /** Called on a click on a tile. */
  open(favorite: Favorite): void;
  /** Called on a middle click on a tile. */
  unload(favorite: Favorite): void;
}

export class FavoritesView {
  #document: Document;
  #actions: TileActions;
  #root: HTMLElement;
  #favorites = new Map<string, Favorite>();
  #tiles = new Map<string, HTMLElement>();
  #signature = '';
  #onClick = (event: Event): void => this.#handle(event as MouseEvent);
  #onMouseDown = (event: Event): void => {
    if ((event as MouseEvent).button === MIDDLE_BUTTON) {
      event.preventDefault();
    }
  };

  /**
   * The Favorites grid drawn from bookmarks: one icon tile per Favorite, the same in every
   * workspace. The tile of the current tab has a glowing border and the tile of an unloaded
   * tab is dimmed.
   *
   * @param document The document of Vivaldi's browser window.
   * @param actions What clicks on tiles do.
   */
  constructor(document: Document, actions: TileActions) {
    this.#document = document;
    this.#actions = actions;
    this.#root = document.createElement('div');
    this.#root.setAttribute(TILES_ATTRIBUTE, '');
    this.#root.addEventListener('click', this.#onClick);
    this.#root.addEventListener('auxclick', this.#onClick);
    this.#root.addEventListener('mousedown', this.#onMouseDown);
  }

  /**
   * @returns The grid element, to place in the tab bar.
   */
  public get element(): HTMLElement {
    return this.#root;
  }

  /**
   * @returns How many tiles the grid shows.
   */
  public get count(): number {
    return this.#tiles.size;
  }

  /**
   * Shows the Favorites in order. Tiles are rebuilt only when the Favorites changed.
   *
   * @param favorites The Favorites.
   */
  public show(favorites: Favorite[]): void {
    const signature = JSON.stringify(favorites);
    if (signature === this.#signature) {
      return;
    }
    this.#signature = signature;
    this.#favorites = new Map(favorites.map((favorite) => [favorite.id, favorite]));
    this.#tiles = new Map(favorites.map((favorite) => [favorite.id, this.#tileOf(favorite)]));
    this.#root.replaceChildren(...this.#tiles.values());
  }

  /**
   * Shows the state of each tile.
   *
   * @param states The state of each tile, by bookmark id.
   */
  public apply(states: Map<string, TileState>): void {
    this.#tiles.forEach((tile, id) => {
      const state = states.get(id);
      tile.toggleAttribute(CURRENT_ATTRIBUTE, state?.active === true);
      tile.toggleAttribute(DIMMED_ATTRIBUTE, state?.unloaded ?? true);
      tile.toggleAttribute(AWAY_ATTRIBUTE, state?.away === true);
    });
  }

  /**
   * Removes the grid and its listeners.
   */
  public destroy(): void {
    this.#root.removeEventListener('click', this.#onClick);
    this.#root.removeEventListener('auxclick', this.#onClick);
    this.#root.removeEventListener('mousedown', this.#onMouseDown);
    this.#root.remove();
  }

  /**
   * @param url Address of a Favorite.
   * @returns The address of its icon in Vivaldi's favicon service.
   */
  public static iconOf(url: string): string {
    return `chrome://favicon/size/16@2x/${url}`;
  }

  #tileOf(favorite: Favorite): HTMLElement {
    const tile = this.#document.createElement('div');
    tile.setAttribute(TILE_ATTRIBUTE, favorite.id);
    tile.setAttribute(DIMMED_ATTRIBUTE, '');
    tile.title = favorite.title;
    const letter = this.#document.createElement('span');
    letter.textContent = (favorite.title.trim()[0] ?? '?').toUpperCase();
    const icon = this.#document.createElement('img');
    icon.alt = '';
    icon.addEventListener('error', () => icon.remove(), { once: true });
    icon.src = FavoritesView.iconOf(favorite.url);
    tile.append(letter, icon);
    return tile;
  }

  #handle(event: MouseEvent): void {
    const favorite = this.#favoriteAt(event.target);
    if (favorite === undefined) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'click' && event.button === PRIMARY_BUTTON) {
      this.#actions.open(favorite);
    } else if (event.type === 'auxclick' && event.button === MIDDLE_BUTTON) {
      this.#actions.unload(favorite);
    }
  }

  #favoriteAt(target: EventTarget | null): Favorite | undefined {
    const tile = target instanceof Element ? target.closest(`[${TILE_ATTRIBUTE}]`) : null;
    const id = tile?.getAttribute(TILE_ATTRIBUTE);
    return id === null || id === undefined ? undefined : this.#favorites.get(id);
  }
}
