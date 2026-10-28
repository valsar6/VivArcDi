const MAX_GRAPHEMES = 2;
const IDENTIFIER = /^[\w.-]*$/;
class SpaceIcon {
  /**
   * Decides how the header draws the icon of a workspace. The format of Vivaldi's `icon` field is
   * not known, so it is shown only when it looks like a short emoji or symbol: at most two
   * graphemes and not an identifier such as `workspace_icon_1`. Anything else becomes the first
   * letter of the name, uppercased.
   *
   * @param icon The `icon` field of the workspace, or null.
   * @param name The name of the workspace.
   * @returns What to draw.
   */
  static of(icon, name) {
    const text = icon?.trim() ?? "";
    if (text !== "" && !IDENTIFIER.test(text) && SpaceIcon.#graphemes(text) <= MAX_GRAPHEMES) {
      return { kind: "text", text };
    }
    return { kind: "letter", text: (SpaceIcon.#first(name) ?? "?").toUpperCase() };
  }
  static #graphemes(text) {
    return [...new Intl.Segmenter().segment(text)].length;
  }
  static #first(name) {
    return [...new Intl.Segmenter().segment(name.trim())][0]?.segment;
  }
}
export {
  SpaceIcon
};
