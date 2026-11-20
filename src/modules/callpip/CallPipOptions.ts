import { Option } from '../../core/boot/options/Option.js';
import { OptionSchema } from '../../core/boot/options/OptionSchema.js';
import type { OptionValues } from '../../core/boot/options/OptionSchema.js';

export const CALL_PIP_OPTIONS = OptionSchema.of({
  meet: Option.boolean(true),
  openOnTabSwitch: Option.boolean(true),
  shortcutLetter: Option.text('p', { nonEmpty: true }),
});

export type CallPipOptions = OptionValues<typeof CALL_PIP_OPTIONS>;
