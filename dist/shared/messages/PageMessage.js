function parsePageMessage(value, prefix, isMessage) {
  const parsed = typeof value === "string" ? fromConsole(value, prefix) : value;
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }
  const candidate = { ...parsed };
  return isMessage(candidate) ? candidate : null;
}
function hasEnvelope(candidate, type) {
  return candidate["type"] === type && typeof candidate["token"] === "string";
}
function fromConsole(line, prefix) {
  if (!line.startsWith(prefix)) {
    return null;
  }
  try {
    return JSON.parse(line.slice(prefix.length));
  } catch {
    return null;
  }
}
export {
  hasEnvelope,
  parsePageMessage
};
