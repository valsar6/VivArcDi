export interface LittleArcSettings {
  commandBar: boolean;
  externalLinks: boolean;
  askWorkspace: boolean;
  idleCloseHours: number;
  widthPercent: number;
  heightPercent: number;
}

const MIN_PERCENT = 20;
const MAX_PERCENT = 100;

export const LITTLE_ARC_DEFAULTS: Readonly<LittleArcSettings> = Object.freeze({
  commandBar: true,
  externalLinks: true,
  askWorkspace: false,
  idleCloseHours: 6,
  widthPercent: 34,
  heightPercent: 60,
});

/**
 * Reads the options of `config.json`, keeping sizes within 20 to 100 percent.
 *
 * @param options The module's options.
 * @returns Complete settings.
 */
export function settingsFrom(options: Record<string, unknown>): LittleArcSettings {
  const merged = { ...LITTLE_ARC_DEFAULTS, ...options };
  const clamp = (value: number): number => Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, Number(value) || MAX_PERCENT));
  return {
    commandBar: merged.commandBar === true,
    externalLinks: merged.externalLinks === true,
    askWorkspace: merged.askWorkspace === true,
    idleCloseHours: Math.max(0, Number(merged.idleCloseHours) || 0),
    widthPercent: clamp(merged.widthPercent),
    heightPercent: clamp(merged.heightPercent),
  };
}
