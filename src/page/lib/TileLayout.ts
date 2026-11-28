import type { CallTile } from './CallTiles.js';
import type { TilePage } from './TilePager.js';

const SPOTLIGHT_SHARE = 0.7;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlacedTile {
  tile: CallTile;
  rect: Rect;
}

const ASPECT_WIDTH = 16;
const ASPECT_HEIGHT = 9;
const TILE_ASPECT = ASPECT_WIDTH / ASPECT_HEIGHT;

function fittedArea(width: number, height: number): number {
  const fitted = Math.min(width, height * TILE_ASPECT);
  return fitted * (fitted / TILE_ASPECT);
}

function bestColumns(count: number, area: Rect): number {
  let best = 1;
  let bestArea = 0;
  for (let columns = 1; columns <= Math.max(1, count); columns += 1) {
    const rows = Math.ceil(count / columns);
    const cell = fittedArea(area.width / columns, area.height / rows);
    if (cell > bestArea) {
      best = columns;
      bestArea = cell;
    }
  }
  return best;
}

function grid(tiles: CallTile[], area: Rect): PlacedTile[] {
  const columns = bestColumns(tiles.length, area);
  const rows = Math.max(1, Math.ceil(tiles.length / columns));
  const width = area.width / columns;
  const height = area.height / rows;
  return tiles.map((tile, index) => ({
    tile,
    rect: { x: area.x + (index % columns) * width, y: area.y + Math.floor(index / columns) * height, width, height },
  }));
}

export class TileLayout {
  /**
   * Places the tiles of a page on a picture: the primary tile large on the left with the others
   * beside it, or a grid when no tile stands out.
   *
   * @param page The page of tiles to show.
   * @param width The width of the picture.
   * @param height The height of the picture.
   * @returns Each tile with the rectangle it fills.
   */
  public static place(page: TilePage, width: number, height: number): PlacedTile[] {
    const { primary, others } = page;
    if (primary === null) {
      return grid(others, { x: 0, y: 0, width, height });
    }
    if (others.length === 0) {
      return [{ tile: primary, rect: { x: 0, y: 0, width, height } }];
    }
    const main = width * SPOTLIGHT_SHARE;
    return [{ tile: primary, rect: { x: 0, y: 0, width: main, height } }, ...grid(others, { x: main, y: 0, width: width - main, height })];
  }
}
