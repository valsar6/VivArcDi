import { Option } from "../../core/boot/options/Option.js";
import { OptionSchema } from "../../core/boot/options/OptionSchema.js";
const WORKSPACE_SYNC_OPTIONS = OptionSchema.of({
  folder: Option.text("VivArcDi Sync", { nonEmpty: true }),
  renameFromOtherComputers: Option.boolean(true)
});
export {
  WORKSPACE_SYNC_OPTIONS
};
