const LITTLE_ARC_MESSAGE_TYPE = "vivarcdi-little-arc";
const LITTLE_ARC_CONSOLE_PREFIX = "vivarcdi-little-arc:";
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
function pageLinkMessage(token, tabId, url) {
  return { type: LITTLE_ARC_MESSAGE_TYPE, action: "page-link", token, tabId, url };
}
function parsePageLinkMessage(value) {
  const candidate = typeof value === "string" ? pageLinkFromConsole(value) : value;
  if (typeof candidate !== "object" || candidate === null) {
    return null;
  }
  const message = candidate;
  return isPageLink(message) ? pageLinkMessage(message["token"], message["tabId"], message["url"]) : null;
}
function isPageLink(message) {
  return message["type"] === LITTLE_ARC_MESSAGE_TYPE && message["action"] === "page-link" && typeof message["token"] === "string" && Number.isInteger(message["tabId"]) && typeof message["url"] === "string";
}
function pageLinkFromConsole(line) {
  if (!line.startsWith(LITTLE_ARC_CONSOLE_PREFIX)) {
    return null;
  }
  try {
    return JSON.parse(line.slice(LITTLE_ARC_CONSOLE_PREFIX.length));
  } catch {
    return null;
  }
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
  LITTLE_ARC_CONSOLE_PREFIX,
  LITTLE_ARC_MESSAGE_TYPE,
  adoptMessage,
  destinationAnswer,
  destinationQuestion,
  isDestinationQuestion,
  pageLinkMessage,
  parseAdoptMessage,
  parseDestinationAnswer,
  parsePageLinkMessage
};
