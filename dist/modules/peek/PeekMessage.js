import { hasEnvelope, parsePageMessage } from "../../shared/messages/PageMessage.js";
const PEEK_MESSAGE_TYPE = "vivarcdi-peek";
const CONSOLE_PREFIX = "vivarcdi-peek:";
const DISPOSITIONS = /* @__PURE__ */ new Set(["new-window", "new-tab", "same-tab"]);
const COMMANDS = /* @__PURE__ */ new Set(["close", "expand"]);
const isPeekMessage = (candidate) => hasEnvelope(candidate, PEEK_MESSAGE_TYPE) && (isOpen(candidate) || isCommand(candidate));
function parsePeekMessage(value) {
  return parsePageMessage(value, CONSOLE_PREFIX, isPeekMessage);
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
