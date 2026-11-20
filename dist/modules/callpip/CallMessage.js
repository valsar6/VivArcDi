const CALL_MESSAGE_TYPE = "vivarcdi-call-pip";
const CALL_CONSOLE_PREFIX = "vivarcdi-call-pip:";
const REASONS = ["unsupported-page", "request-failed"];
function parseCallMessage(value) {
  const candidate = typeof value === "string" ? fromConsole(value) : value;
  if (typeof candidate !== "object" || candidate === null) {
    return null;
  }
  const message = candidate;
  const valid = message["type"] === CALL_MESSAGE_TYPE && typeof message["token"] === "string" && typeof message["tabId"] === "number" && REASONS.includes(message["reason"]);
  return valid ? message : null;
}
function fromConsole(line) {
  if (!line.startsWith(CALL_CONSOLE_PREFIX)) {
    return null;
  }
  try {
    return JSON.parse(line.slice(CALL_CONSOLE_PREFIX.length));
  } catch {
    return null;
  }
}
export {
  CALL_CONSOLE_PREFIX,
  CALL_MESSAGE_TYPE,
  parseCallMessage
};
