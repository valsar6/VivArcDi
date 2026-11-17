import { Option } from "../../core/boot/options/Option.js";
import { OptionSchema } from "../../core/boot/options/OptionSchema.js";
const DEFAULT_TOAST_MS = 2e3;
const MIN_TOAST_MS = 500;
const MAX_TOAST_MS = 1e4;
const COPY_URL_OPTIONS = OptionSchema.of({
  toastMs: Option.number(DEFAULT_TOAST_MS, { min: MIN_TOAST_MS, max: MAX_TOAST_MS })
});
export {
  COPY_URL_OPTIONS
};
