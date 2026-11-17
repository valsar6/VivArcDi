import { Option } from "../../core/boot/options/Option.js";
import { OptionSchema } from "../../core/boot/options/OptionSchema.js";
const DEFAULT_REFRESH_MINUTES = 5;
const MAX_REFRESH_MINUTES = 60;
const LIVE_FOLDERS_OPTIONS = OptionSchema.of({
  refreshMinutes: Option.number(DEFAULT_REFRESH_MINUTES, { min: 1, max: MAX_REFRESH_MINUTES }),
  githubClientId: Option.text("")
});
export {
  LIVE_FOLDERS_OPTIONS
};
