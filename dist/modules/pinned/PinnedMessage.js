import { hasEnvelope, parsePageMessage } from "../../shared/messages/PageMessage.js";
const PINNED_MESSAGE_TYPE = "vivarcdi-pinned";
const PINNED_CONSOLE_PREFIX = "vivarcdi-pinned:";
const isPinnedMessage = (candidate) => hasEnvelope(candidate, PINNED_MESSAGE_TYPE) && typeof candidate["tabId"] === "number" && candidate["action"] === "close";
function parsePinnedMessage(value) {
  return parsePageMessage(value, PINNED_CONSOLE_PREFIX, isPinnedMessage);
}
export {
  PINNED_CONSOLE_PREFIX,
  PINNED_MESSAGE_TYPE,
  parsePinnedMessage
};
