import { Option } from '../../core/boot/options/Option.js';
import { OptionSchema } from '../../core/boot/options/OptionSchema.js';
import type { OptionValues } from '../../core/boot/options/OptionSchema.js';

const DEFAULT_DELAY_MS = 400;
const MIN_DELAY_MS = 100;
const MAX_DELAY_MS = 2000;

export const FOLDER_PREVIEW_OPTIONS = OptionSchema.of({
  hoverDelayMs: Option.number(DEFAULT_DELAY_MS, { min: MIN_DELAY_MS, max: MAX_DELAY_MS }),
});

export type FolderPreviewOptions = OptionValues<typeof FOLDER_PREVIEW_OPTIONS>;
