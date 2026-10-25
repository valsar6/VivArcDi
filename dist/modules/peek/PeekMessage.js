const PEEK_MESSAGE_TYPE = "vivarcdi-peek";
const CONSOLE_PREFIX = "vivarcdi-peek:";
const DISPOSITIONS = /* @__PURE__ */ new Set(["new-window", "new-tab", "same-tab"]);
const COMMANDS = /* @__PURE__ */ new Set(["close", "expand"]);
function parsePeekMessage(value) {
  const candidate = typeof value === "string" ? fromConsole(value) : value;
  if (typeof candidate !== "object" || candidate === null) {
    return null;
  }
  const message = candidate;
  if (message["type"] !== PEEK_MESSAGE_TYPE || typeof message["token"] !== "string") {
    return null;
  }
  return isOpen(message) || isCommand(message) ? message : null;
}
function fromConsole(line) {
  if (!line.startsWith(CONSOLE_PREFIX)) {
    return null;
  }
  try {
    return JSON.parse(line.slice(CONSOLE_PREFIX.length));
  } catch {
    return null;
  }
}
function isOpen(message) {
  return message["action"] === "open" && typeof message["url"] === "string" && typeof message["tabId"] === "number" && DISPOSITIONS.has(message["disposition"]);
}
function isCommand(message) {
  return message["action"] === "command" && COMMANDS.has(message["command"]);
}
export {
  CONSOLE_PREFIX,
  PEEK_MESSAGE_TYPE,
  parsePeekMessage
};
