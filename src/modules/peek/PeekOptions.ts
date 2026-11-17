import { Option } from '../../core/boot/options/Option.js';
import { OptionSchema } from '../../core/boot/options/OptionSchema.js';
import type { OptionValues } from '../../core/boot/options/OptionSchema.js';

const MIN_PERCENT = 40;
const MAX_PERCENT = 100;
const DEFAULT_WIDTH = 90;
const DEFAULT_HEIGHT = 94;
const PERCENT = { min: MIN_PERCENT, max: MAX_PERCENT };

export const PEEK_OPTIONS = OptionSchema.of({
  shiftClick: Option.boolean(true),
  pinnedCrossSite: Option.boolean(true),
  anyCrossSite: Option.boolean(false),
  pinnedNewTab: Option.boolean(true),
  anyNewTab: Option.boolean(false),
  widthPercent: Option.number(DEFAULT_WIDTH, PERCENT),
  heightPercent: Option.number(DEFAULT_HEIGHT, PERCENT),
});

export type PeekOptions = OptionValues<typeof PEEK_OPTIONS>;
