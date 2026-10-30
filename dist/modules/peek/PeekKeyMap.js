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
function shortcutLabels(platform) {
  const modifier = platform.toLowerCase().startsWith("mac") ? "Cmd" : "Ctrl";
  return { close: `${modifier}+W`, expand: `${modifier}+O` };
}
export {
  commandFor,
  shortcutLabels
};
