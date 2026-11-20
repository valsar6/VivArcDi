import { Option } from "../../core/boot/options/Option.js";
import { OptionSchema } from "../../core/boot/options/OptionSchema.js";
const CALL_PIP_OPTIONS = OptionSchema.of({
  meet: Option.boolean(true),
  shortcutLetter: Option.text("p", { nonEmpty: true })
});
export {
  CALL_PIP_OPTIONS
};
