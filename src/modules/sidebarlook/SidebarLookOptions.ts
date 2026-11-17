import { Option } from '../../core/boot/options/Option.js';
import { OptionSchema } from '../../core/boot/options/OptionSchema.js';
import type { OptionValues } from '../../core/boot/options/OptionSchema.js';

import { Palettes } from './Palettes.js';

export const SIDEBAR_LOOK_OPTIONS = OptionSchema.of({
  palette: Option.choice(Palettes.defaultName, Palettes.names),
});

export type SidebarLookOptions = OptionValues<typeof SIDEBAR_LOOK_OPTIONS>;
