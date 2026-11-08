const LITTLE_ARC_MESSAGE_TYPE = "vivarcdi-little-arc";
function adoptMessage(tabId, windowId) {
  return { type: LITTLE_ARC_MESSAGE_TYPE, action: "adopt", tabId, windowId };
}
function parseAdoptMessage(value) {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const { type, action, tabId, windowId } = value;
  if (type !== LITTLE_ARC_MESSAGE_TYPE || action !== "adopt" || !Number.isInteger(tabId) || !Number.isInteger(windowId)) {
    return null;
  }
  return adoptMessage(tabId, windowId);
}
export {
  LITTLE_ARC_MESSAGE_TYPE,
  adoptMessage,
  parseAdoptMessage
};
