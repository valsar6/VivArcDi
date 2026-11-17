import { Option } from '../../core/boot/options/Option.js';
import { OptionSchema } from '../../core/boot/options/OptionSchema.js';
import type { OptionValues } from '../../core/boot/options/OptionSchema.js';

export const WORKSPACE_SYNC_OPTIONS = OptionSchema.of({
  folder: Option.text('VivArcDi Sync', { nonEmpty: true }),
  renameFromOtherComputers: Option.boolean(true),
});

export type WorkspaceSyncOptions = OptionValues<typeof WORKSPACE_SYNC_OPTIONS>;
