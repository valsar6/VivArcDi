const NAMES = ["space", "pill", "ink"];
const propertyOf = (name) => `--vivarcdi-${name}`;
class DestinationPalette {
  /**
   * Reads the colors that the sidebar look put on a window's root, the variables of
   * `--vivarcdi-space`, `--vivarcdi-pill` and `--vivarcdi-ink`.
   *
   * @param root The root element of a window (`#browser`), or null.
   * @returns The three colors, or null when the sidebar look did not set them.
   */
  static read(root) {
    if (root === null) {
      return null;
    }
    const read = (name) => root.style.getPropertyValue(propertyOf(name)).trim();
    const colors = { space: read("space"), pill: read("pill"), ink: read("ink") };
    return Object.values(colors).every((value) => value !== "") ? colors : null;
  }
  /**
   * Sets the colors on the root of a window, the same variables the sidebar look uses.
   *
   * @param root The root element of a window.
   * @param colors The colors to set.
   */
  static apply(root, colors) {
    NAMES.forEach((name) => root.style.setProperty(propertyOf(name), colors[name]));
  }
  /**
   * Removes the variables that `apply` set.
   *
   * @param root The root element of a window.
   */
  static clear(root) {
    NAMES.forEach((name) => root.style.removeProperty(propertyOf(name)));
  }
}
export {
  DestinationPalette
};
