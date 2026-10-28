const COPY_MESSAGE_TYPE = "vivarcdi-copy";
const COPY_CONSOLE_PREFIX = "vivarcdi-copy:";
function parseCopyMessage(value) {
  const candidate = typeof value === "string" ? fromConsole(value) : value;
  if (typeof candidate !== "object" || candidate === null) {
    return null;
  }
  const message = candidate;
  const valid = message["type"] === COPY_MESSAGE_TYPE && typeof message["token"] === "string" && typeof message["tabId"] === "number" && message["action"] === "copy";
  return valid ? message : null;
}
function fromConsole(line) {
  if (!line.startsWith(COPY_CONSOLE_PREFIX)) {
    return null;
  }
  try {
    return JSON.parse(line.slice(COPY_CONSOLE_PREFIX.length));
  } catch {
    return null;
  }
}
export {
  COPY_CONSOLE_PREFIX,
  COPY_MESSAGE_TYPE,
  parseCopyMessage
};
