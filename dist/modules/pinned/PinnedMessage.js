const PINNED_MESSAGE_TYPE = "vivarcdi-pinned";
const PINNED_CONSOLE_PREFIX = "vivarcdi-pinned:";
function parsePinnedMessage(value) {
  const candidate = typeof value === "string" ? fromConsole(value) : value;
  if (typeof candidate !== "object" || candidate === null) {
    return null;
  }
  const message = candidate;
  const valid = message["type"] === PINNED_MESSAGE_TYPE && typeof message["token"] === "string" && typeof message["tabId"] === "number" && message["action"] === "close";
  return valid ? message : null;
}
function fromConsole(line) {
  if (!line.startsWith(PINNED_CONSOLE_PREFIX)) {
    return null;
  }
  try {
    return JSON.parse(line.slice(PINNED_CONSOLE_PREFIX.length));
  } catch {
    return null;
  }
}
export {
  PINNED_CONSOLE_PREFIX,
  PINNED_MESSAGE_TYPE,
  parsePinnedMessage
};
