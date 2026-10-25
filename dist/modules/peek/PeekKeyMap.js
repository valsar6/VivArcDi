function commandFor(event) {
  const key = event.key.toLowerCase();
  if (key === "escape") {
    return "close";
  }
  if (!event.metaKey && !event.ctrlKey) {
    return null;
  }
  if (key === "w") {
    return "close";
  }
  return key === "o" ? "expand" : null;
}
export {
  commandFor
};
