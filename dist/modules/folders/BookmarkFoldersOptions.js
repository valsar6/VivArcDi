import { Option } from "../../core/boot/options/Option.js";
import { OptionSchema } from "../../core/boot/options/OptionSchema.js";
const DEFAULT_MAX_DEPTH = 3;
const MAX_DEPTH_LIMIT = 10;
const DEFAULT_MAX_HEIGHT_PERCENT = 60;
const MIN_PERCENT = 20;
const MAX_PERCENT = 100;
const BOOKMARK_FOLDERS_OPTIONS = OptionSchema.of({
  root: Option.text(""),
  workspaces: Option.textMap(),
  workspacesBase: Option.text("VivArcDi", { nonEmpty: true }),
  maxDepth: Option.number(DEFAULT_MAX_DEPTH, { min: 1, max: MAX_DEPTH_LIMIT }),
  maxHeightPercent: Option.number(DEFAULT_MAX_HEIGHT_PERCENT, { min: MIN_PERCENT, max: MAX_PERCENT })
});
export {
  BOOKMARK_FOLDERS_OPTIONS
};
