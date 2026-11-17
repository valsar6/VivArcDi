import { Option } from "../../core/boot/options/Option.js";
import { OptionSchema } from "../../core/boot/options/OptionSchema.js";
import { Palettes } from "./Palettes.js";
const SIDEBAR_LOOK_OPTIONS = OptionSchema.of({
  palette: Option.choice(Palettes.defaultName, Palettes.names)
});
export {
  SIDEBAR_LOOK_OPTIONS
};
