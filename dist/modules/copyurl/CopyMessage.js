import { hasEnvelope, parsePageMessage } from "../../shared/messages/PageMessage.js";
const COPY_MESSAGE_TYPE = "vivarcdi-copy";
const COPY_CONSOLE_PREFIX = "vivarcdi-copy:";
const isCopyMessage = (candidate) => hasEnvelope(candidate, COPY_MESSAGE_TYPE) && typeof candidate["tabId"] === "number" && candidate["action"] === "copy";
function parseCopyMessage(value) {
  return parsePageMessage(value, COPY_CONSOLE_PREFIX, isCopyMessage);
}
export {
  COPY_CONSOLE_PREFIX,
  COPY_MESSAGE_TYPE,
  parseCopyMessage
};
