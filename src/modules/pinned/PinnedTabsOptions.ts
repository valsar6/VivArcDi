import { Option } from '../../core/boot/options/Option.js';
import { OptionSchema } from '../../core/boot/options/OptionSchema.js';
import type { OptionValues } from '../../core/boot/options/OptionSchema.js';

export const PINNED_TABS_OPTIONS = OptionSchema.of({
  unloadOnClose: Option.boolean(true),
});

export type PinnedTabsOptions = OptionValues<typeof PINNED_TABS_OPTIONS>;
