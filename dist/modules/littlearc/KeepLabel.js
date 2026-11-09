const UNKNOWN_NAME = "workspace";
class KeepLabel {
  /**
   * @param platform The value of `navigator.platform`.
   * @returns Whether it is macOS.
   */
  static isMac(platform) {
    return platform.toLowerCase().startsWith("mac");
  }
  /**
   * The text of the button that keeps the page: "Open in", the workspace in bold and the shortcut.
   *
   * @param name The name of the destination workspace, or nothing when it is not known.
   * @param platform The value of `navigator.platform`.
   * @returns The three parts of the label.
   */
  static of(name, platform) {
    const known = (name ?? "").trim();
    return {
      prefix: "Open in",
      name: known === "" ? UNKNOWN_NAME : known,
      shortcut: KeepLabel.isMac(platform) ? "\u2318O" : "Ctrl+O"
    };
  }
}
export {
  KeepLabel
};
