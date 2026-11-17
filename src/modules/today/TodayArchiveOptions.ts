import { Option } from '../../core/boot/options/Option.js';
import { OptionSchema } from '../../core/boot/options/OptionSchema.js';
import type { OptionValues } from '../../core/boot/options/OptionSchema.js';

const DEFAULT_HOURS = 12;
const MIN_HOURS = 1;
const MAX_HOURS = 720;
const DEFAULT_LIMIT = 500;
const MIN_LIMIT = 50;
const MAX_LIMIT = 5000;

export const TODAY_ARCHIVE_OPTIONS = OptionSchema.of({
  archiveAfterHours: Option.number(DEFAULT_HOURS, { min: MIN_HOURS, max: MAX_HOURS }),
  archiveLimit: Option.number(DEFAULT_LIMIT, { min: MIN_LIMIT, max: MAX_LIMIT }),
});

export type TodayArchiveOptions = OptionValues<typeof TODAY_ARCHIVE_OPTIONS>;
