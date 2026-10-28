const ARCHIVE_MESSAGE_TYPE = "vivarcdi-archive";
const ARCHIVE_CONSOLE_PREFIX = "vivarcdi-archive:";
function parseArchiveMessage(value) {
  const candidate = typeof value === "string" ? fromConsole(value) : value;
  if (typeof candidate !== "object" || candidate === null) {
    return null;
  }
  const message = candidate;
  const valid = message["type"] === ARCHIVE_MESSAGE_TYPE && typeof message["token"] === "string" && message["action"] === "open";
  return valid ? message : null;
}
function fromConsole(line) {
  if (!line.startsWith(ARCHIVE_CONSOLE_PREFIX)) {
    return null;
  }
  try {
    return JSON.parse(line.slice(ARCHIVE_CONSOLE_PREFIX.length));
  } catch {
    return null;
  }
}
export {
  ARCHIVE_CONSOLE_PREFIX,
  ARCHIVE_MESSAGE_TYPE,
  parseArchiveMessage
};
