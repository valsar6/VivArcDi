import { Option } from '../../core/boot/options/Option.js';
import { OptionSchema } from '../../core/boot/options/OptionSchema.js';
import type { OptionValues } from '../../core/boot/options/OptionSchema.js';

const DEFAULT_TOAST_MS = 2000;
const MIN_TOAST_MS = 500;
const MAX_TOAST_MS = 10000;

export const COPY_URL_OPTIONS = OptionSchema.of({
  toastMs: Option.number(DEFAULT_TOAST_MS, { min: MIN_TOAST_MS, max: MAX_TOAST_MS }),
});

export type CopyUrlOptions = OptionValues<typeof COPY_URL_OPTIONS>;
