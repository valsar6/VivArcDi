import { TILE_ATTRIBUTE } from './FavoritesView.js';

export const TILE_MINUS_ATTRIBUTE = 'data-vivarcdi-tile-minus';

const UNLOAD_LABEL = 'Unload tab';

const TILE_MINUS_SELECTOR = `[${TILE_MINUS_ATTRIBUTE}]`;
const TILE_SELECTOR = `[${TILE_ATTRIBUTE}]`;

export interface PinnedTileMinusDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** @returns The grid that holds the pinned tiles. */
  grid: () => HTMLElement;
  /** Unloads the tab a tile stands for. */
  unload: (tabId: number) => void;
}

export class PinnedTileMinus {
  #deps: PinnedTileMinusDependencies;
  #buttons = new Map<Element, HTMLButtonElement>();
  #onPress = (event: Event): void => this.#handle(event);

  /**
   * The minus at the right end of every pinned tile: it unloads the tab the tile stands for,
   * like the minus of a pinned row, and stays off the tiles of the bookmark grid.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: PinnedTileMinusDependencies) {
    this.#deps = dependencies;
  }

  /**
   * Takes the presses on the minuses and puts one on every pinned tile.
   */
  public start(): void {
    this.#deps.document.addEventListener('pointerdown', this.#onPress, true);
    this.#deps.document.addEventListener('mousedown', this.#onPress, true);
    this.#deps.document.addEventListener('click', this.#onPress, true);
    this.sync();
  }

  /**
   * Gives every pinned tile a minus, adding the ones the last redraw dropped.
   */
  public sync(): void {
    const grid = this.#deps.grid();
    const tiles = PinnedTileMinus.#tilesOf(grid);
    const present = new Set<Element>(tiles);
    this.#buttons.forEach((button, tile) => {
      if (!present.has(tile) || !PinnedTileMinus.#inside(button, tile)) {
        button.remove();
        this.#buttons.delete(tile);
      }
    });
    tiles.forEach((tile) => this.#place(tile));
  }

  /**
   * Removes the minuses and every listener.
   */
  public stop(): void {
    this.#deps.document.removeEventListener('pointerdown', this.#onPress, true);
    this.#deps.document.removeEventListener('mousedown', this.#onPress, true);
    this.#deps.document.removeEventListener('click', this.#onPress, true);
    this.#buttons.forEach((button) => button.remove());
    this.#buttons.clear();
  }

  #place(tile: Element): void {
    const button = this.#buttons.get(tile) ?? this.#create();
    if (!PinnedTileMinus.#inside(button, tile)) {
      tile.append(button);
    }
    this.#buttons.set(tile, button);
  }

  #create(): HTMLButtonElement {
    const button = this.#deps.document.createElement('button');
    button.setAttribute('type', 'button');
    button.setAttribute(TILE_MINUS_ATTRIBUTE, '');
    button.setAttribute('aria-label', UNLOAD_LABEL);
    return button;
  }

  #handle(event: Event): void {
    const button = (event.target as Element | null)?.closest?.(TILE_MINUS_SELECTOR) ?? null;
    if (button === null || !this.#owns(button)) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.type === 'click') {
      this.#unload(button);
    }
  }

  #unload(button: Element): void {
    const tabId = button.closest(TILE_SELECTOR)?.getAttribute(TILE_ATTRIBUTE);
    if (tabId !== null && tabId !== undefined) {
      this.#deps.unload(Number(tabId));
    }
  }

  #owns(button: Element): boolean {
    const grid = this.#deps.grid();
    let node: Element | null = button;
    while (node !== null) {
      if (node === grid) {
        return true;
      }
      node = node.parentElement;
    }
    return false;
  }

  static #tilesOf(grid: Element): Element[] {
    return Array.from(grid.children).filter((child) => child.hasAttribute(TILE_ATTRIBUTE));
  }

  static #inside(element: Element, ancestor: Element): boolean {
    let node: Element | null = element;
    while (node !== null) {
      if (node === ancestor) {
        return true;
      }
      node = node.parentElement;
    }
    return false;
  }
}
