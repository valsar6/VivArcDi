import { Option } from "../../core/boot/options/Option.js";
import { OptionSchema } from "../../core/boot/options/OptionSchema.js";
const DEFAULT_DELAY_MS = 400;
const MIN_DELAY_MS = 100;
const MAX_DELAY_MS = 2e3;
const FOLDER_PREVIEW_OPTIONS = OptionSchema.of({
  hoverDelayMs: Option.number(DEFAULT_DELAY_MS, { min: MIN_DELAY_MS, max: MAX_DELAY_MS })
});
export {
  FOLDER_PREVIEW_OPTIONS
};
