import type { CallTile } from './CallTiles.js';

const PRIMARY_RATIO = 1.5;

export interface TilePage {
  /** The tile the page shows largest, such as a shared screen, or null when none stands out. */
  primary: CallTile | null;
  /** The other tiles of this page, in page order. */
  others: CallTile[];
}

interface Split {
  primary: CallTile | null;
  rest: CallTile[];
  size: number;
  pages: number;
}

function primaryOf(tiles: CallTile[]): CallTile | null {
  const [largest, second] = [...tiles].sort((a, b) => b.area - a.area);
  return largest !== undefined && second !== undefined && largest.area > 0 && largest.area >= PRIMARY_RATIO * second.area ? largest : null;
}

export class TilePager {
  #maxTiles: number;
  #read: () => CallTile[];
  #index = 0;

  /**
   * Shows the tiles of a call a page at a time. The primary tile, when there is one, stays on every
   * page and counts towards `maxTiles`.
   *
   * @param maxTiles How many tiles one page holds.
   * @param read Reads the tiles of the call as they are now.
   */
  constructor(maxTiles: number, read: () => CallTile[]) {
    this.#maxTiles = maxTiles;
    this.#read = read;
  }

  /**
   * @returns The page to show now; the page number is kept inside the pages that exist.
   */
  public current(): TilePage {
    const { primary, rest, size, pages } = this.#split();
    this.#index = Math.min(this.#index, pages - 1);
    return { primary, others: rest.slice(this.#index * size, (this.#index + 1) * size) };
  }

  /**
   * Moves to the next page, or stays on the last one.
   */
  public next(): void {
    this.#move(1);
  }

  /**
   * Moves to the previous page, or stays on the first one.
   */
  public previous(): void {
    this.#move(-1);
  }

  #move(step: number): void {
    const { pages } = this.#split();
    this.#index = Math.max(0, Math.min(this.#index + step, pages - 1));
  }

  #split(): Split {
    const tiles = this.#read();
    const primary = primaryOf(tiles);
    const rest = tiles.filter((tile) => tile !== primary);
    const size = Math.max(1, primary === null ? this.#maxTiles : this.#maxTiles - 1);
    return { primary, rest, size, pages: Math.max(1, Math.ceil(rest.length / size)) };
  }
}
