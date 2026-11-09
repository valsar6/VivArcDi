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
function destinationQuestion() {
  return { type: LITTLE_ARC_MESSAGE_TYPE, action: "destination" };
}
function isDestinationQuestion(value) {
  const { type, action } = typeof value === "object" && value !== null ? value : {};
  return type === LITTLE_ARC_MESSAGE_TYPE && action === "destination";
}
function destinationAnswer(name, colors) {
  return { type: LITTLE_ARC_MESSAGE_TYPE, action: "destination-answer", name, colors };
}
function parseColors(value) {
  const { space, pill, ink } = typeof value === "object" && value !== null ? value : {};
  return typeof space === "string" && typeof pill === "string" && typeof ink === "string" ? { space, pill, ink } : null;
}
function parseDestinationAnswer(value) {
  const { type, action, name, colors } = typeof value === "object" && value !== null ? value : {};
  if (type !== LITTLE_ARC_MESSAGE_TYPE || action !== "destination-answer") {
    return null;
  }
  return destinationAnswer(typeof name === "string" ? name : null, parseColors(colors));
}
export {
  LITTLE_ARC_MESSAGE_TYPE,
  adoptMessage,
  destinationAnswer,
  destinationQuestion,
  isDestinationQuestion,
  parseAdoptMessage,
  parseDestinationAnswer
};
