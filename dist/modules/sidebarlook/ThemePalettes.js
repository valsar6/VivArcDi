const THEME_PALETTES = Object.freeze({
  "vivarcdi-light": "arclight",
  "vivarcdi-pink": "arcpink",
  "vivarcdi-green": "arcgreen",
  "vivarcdi-dark": "arcdark",
  "vivarcdi-pure-dark": "arcdarkpure"
});
class ThemePalettes {
  /**
   * The palette names that VivArcDi themes select.
   */
  static names = Object.values(THEME_PALETTES);
  /**
   * @param themeId The value of Vivaldi's `vivaldi.themes.current`.
   * @returns The name of the palette that belongs to a VivArcDi theme, or undefined for any other theme.
   */
  static paletteFor(themeId) {
    return typeof themeId === "string" ? THEME_PALETTES[themeId] : void 0;
  }
}
export {
  ThemePalettes
};
