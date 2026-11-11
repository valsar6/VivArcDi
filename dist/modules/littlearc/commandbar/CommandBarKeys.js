const KEYS = /* @__PURE__ */ new Map([
  ["ArrowUp", "up"],
  ["ArrowDown", "down"],
  ["Enter", "submit"],
  ["Escape", "dismiss"]
]);
function keyCommand(event) {
  return event.isComposing ? null : KEYS.get(event.key) ?? null;
}
export {
  keyCommand
};
