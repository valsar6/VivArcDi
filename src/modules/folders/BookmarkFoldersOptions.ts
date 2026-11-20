import { Option } from '../../core/boot/options/Option.js';
import { OptionSchema } from '../../core/boot/options/OptionSchema.js';
import type { OptionValues } from '../../core/boot/options/OptionSchema.js';

const DEFAULT_MAX_DEPTH = 3;
const MAX_DEPTH_LIMIT = 10;

export const BOOKMARK_FOLDERS_OPTIONS = OptionSchema.of({
  root: Option.text(''),
  workspaces: Option.textMap(),
  workspacesBase: Option.text('VivArcDi', { nonEmpty: true }),
  maxDepth: Option.number(DEFAULT_MAX_DEPTH, { min: 1, max: MAX_DEPTH_LIMIT }),
});

export type BookmarkFoldersOptions = OptionValues<typeof BOOKMARK_FOLDERS_OPTIONS>;
