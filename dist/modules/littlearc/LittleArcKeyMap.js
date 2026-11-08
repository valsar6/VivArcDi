const SHORTCUTS = /* @__PURE__ */ new Map([
  ["w", "close"],
  ["o", "keep"]
]);
const isCommandKey = (event) => (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey;
function commandFor(event, fieldEmpty) {
  const key = event.key.toLowerCase();
  if (key === "escape") {
    return fieldEmpty ? "close" : "clear";
  }
  return isCommandKey(event) ? SHORTCUTS.get(key) ?? null : null;
}
export {
  commandFor
};
