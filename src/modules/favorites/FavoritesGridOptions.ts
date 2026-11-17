import { Option } from '../../core/boot/options/Option.js';
import { OptionSchema } from '../../core/boot/options/OptionSchema.js';
import type { OptionValues } from '../../core/boot/options/OptionSchema.js';

const MAX_TILES = 48;
const DEFAULT_TILES = 12;
const MAX_COLUMNS = 6;
const DEFAULT_COLUMNS = 3;
const MIN_TILE_WIDTH = 40;
const MAX_TILE_WIDTH = 200;
const DEFAULT_TILE_WIDTH = 64;
const MIN_TILE_HEIGHT = 32;
const MAX_TILE_HEIGHT = 96;
const DEFAULT_TILE_HEIGHT = 44;
const MAX_GAP = 24;
const DEFAULT_GAP = 8;

export const FAVORITES_GRID_OPTIONS = OptionSchema.of({
  folder: Option.text('Favorites', { nonEmpty: true }),
  maxTiles: Option.number(DEFAULT_TILES, { min: 1, max: MAX_TILES }),
  maxColumns: Option.number(DEFAULT_COLUMNS, { min: 1, max: MAX_COLUMNS }),
  tileMinWidth: Option.number(DEFAULT_TILE_WIDTH, { min: MIN_TILE_WIDTH, max: MAX_TILE_WIDTH }),
  tileHeight: Option.number(DEFAULT_TILE_HEIGHT, { min: MIN_TILE_HEIGHT, max: MAX_TILE_HEIGHT }),
  gap: Option.number(DEFAULT_GAP, { min: 0, max: MAX_GAP }),
  unloadOnMiddleClick: Option.boolean(true),
});

export type FavoritesGridOptions = OptionValues<typeof FAVORITES_GRID_OPTIONS>;
