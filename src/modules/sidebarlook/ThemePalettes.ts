const THEME_PALETTES: Readonly<Record<string, string>> = Object.freeze({
  'vivarcdi-light': 'arclight',
  'vivarcdi-pink': 'arcpink',
  'vivarcdi-green': 'arcgreen',
  'vivarcdi-dark': 'arcdark',
  'vivarcdi-pure-dark': 'arcdarkpure',
});

export class ThemePalettes {
  /**
   * The palette names that VivArcDi themes select.
   */
  public static readonly names: readonly string[] = Object.values(THEME_PALETTES);

  /**
   * @param themeId The value of Vivaldi's `vivaldi.themes.current`.
   * @returns The name of the palette that belongs to a VivArcDi theme, or undefined for any other theme.
   */
  public static paletteFor(themeId: unknown): string | undefined {
    return typeof themeId === 'string' ? THEME_PALETTES[themeId] : undefined;
  }
}
