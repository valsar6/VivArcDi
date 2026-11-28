import { hasEnvelope, parsePageMessage } from "../../shared/messages/PageMessage.js";
const CALL_MESSAGE_TYPE = "vivarcdi-call-pip";
const CALL_CONSOLE_PREFIX = "vivarcdi-call-pip:";
const REASONS = ["unsupported-page", "request-failed", "composition-failed", "control-not-found"];
const isCallMessage = (candidate) => hasEnvelope(candidate, CALL_MESSAGE_TYPE) && typeof candidate["tabId"] === "number" && REASONS.includes(candidate["reason"]);
function parseCallMessage(value) {
  return parsePageMessage(value, CALL_CONSOLE_PREFIX, isCallMessage);
}
export {
  CALL_CONSOLE_PREFIX,
  CALL_MESSAGE_TYPE,
  parseCallMessage
};
