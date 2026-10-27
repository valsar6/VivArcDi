const ENGLISH = { search: (folder) => `Search ${folder}\u2026`, never: "never opened", empty: "No match" };
const ITALIAN = { search: (folder) => `Cerca in ${folder}\u2026`, never: "mai aperto", empty: "Nessun risultato" };
class PreviewText {
  /**
   * @param locale A language tag such as `it` or `en-US`.
   * @returns The texts of the panel in that language; English when it is not known.
   */
  static of(locale) {
    return locale.toLowerCase().startsWith("it") ? ITALIAN : ENGLISH;
  }
}
export {
  PreviewText
};
