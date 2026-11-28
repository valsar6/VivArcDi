import { Option } from '../../core/boot/options/Option.js';
import { OptionSchema } from '../../core/boot/options/OptionSchema.js';
import type { OptionValues } from '../../core/boot/options/OptionSchema.js';

const DEFAULT_MAX_TILES = 9;
const MIN_TILES = 2;
const MAX_TILES = 25;

export const CALL_PIP_OPTIONS = OptionSchema.of({
  meet: Option.boolean(true),
  openOnTabSwitch: Option.boolean(true),
  shortcutLetter: Option.text('p', { nonEmpty: true }),
  maxTiles: Option.number(DEFAULT_MAX_TILES, { min: MIN_TILES, max: MAX_TILES }),
});

export type CallPipOptions = OptionValues<typeof CALL_PIP_OPTIONS>;
