import { Option } from "../../core/boot/options/Option.js";
import { OptionSchema } from "../../core/boot/options/OptionSchema.js";
const PINNED_TABS_OPTIONS = OptionSchema.of({
  resetButton: Option.boolean(true),
  unloadOnClose: Option.boolean(true)
});
export {
  PINNED_TABS_OPTIONS
};
