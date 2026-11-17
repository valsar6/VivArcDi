import { Option } from "../../core/boot/options/Option.js";
import { OptionSchema } from "../../core/boot/options/OptionSchema.js";
const MIN_PERCENT = 20;
const MAX_PERCENT = 100;
const MAX_IDLE_HOURS = 168;
const DEFAULT_IDLE_HOURS = 6;
const DEFAULT_WIDTH = 34;
const DEFAULT_HEIGHT = 60;
const PERCENT = { min: MIN_PERCENT, max: MAX_PERCENT };
const LITTLE_ARC_OPTIONS = OptionSchema.of({
  commandBar: Option.boolean(true),
  externalLinks: Option.boolean(true),
  askWorkspace: Option.boolean(false),
  idleCloseHours: Option.number(DEFAULT_IDLE_HOURS, { min: 0, max: MAX_IDLE_HOURS }),
  widthPercent: Option.number(DEFAULT_WIDTH, PERCENT),
  heightPercent: Option.number(DEFAULT_HEIGHT, PERCENT)
});
export {
  LITTLE_ARC_OPTIONS
};
