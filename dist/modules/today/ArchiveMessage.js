import { hasEnvelope, parsePageMessage } from "../../shared/messages/PageMessage.js";
const ARCHIVE_MESSAGE_TYPE = "vivarcdi-archive";
const ARCHIVE_CONSOLE_PREFIX = "vivarcdi-archive:";
const isArchiveMessage = (candidate) => hasEnvelope(candidate, ARCHIVE_MESSAGE_TYPE) && (candidate["action"] === "open" || candidate["action"] === "clear");
function parseArchiveMessage(value) {
  return parsePageMessage(value, ARCHIVE_CONSOLE_PREFIX, isArchiveMessage);
}
export {
  ARCHIVE_CONSOLE_PREFIX,
  ARCHIVE_MESSAGE_TYPE,
  parseArchiveMessage
};
