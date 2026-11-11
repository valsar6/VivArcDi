const MIN_PERCENT = 20;
const MAX_PERCENT = 100;
const LITTLE_ARC_DEFAULTS = Object.freeze({
  commandBar: true,
  externalLinks: true,
  askWorkspace: false,
  idleCloseHours: 6,
  widthPercent: 34,
  heightPercent: 60
});
function settingsFrom(options) {
  const merged = { ...LITTLE_ARC_DEFAULTS, ...options };
  const clamp = (value) => Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, Number(value) || MAX_PERCENT));
  return {
    commandBar: merged.commandBar === true,
    externalLinks: merged.externalLinks === true,
    askWorkspace: merged.askWorkspace === true,
    idleCloseHours: Math.max(0, Number(merged.idleCloseHours) || 0),
    widthPercent: clamp(merged.widthPercent),
    heightPercent: clamp(merged.heightPercent)
  };
}
export {
  LITTLE_ARC_DEFAULTS,
  settingsFrom
};
