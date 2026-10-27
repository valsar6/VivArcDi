export interface PreviewTexts {
  search: (folder: string) => string;
  never: string;
  empty: string;
}

const ENGLISH: PreviewTexts = { search: (folder) => `Search ${folder}…`, never: 'never opened', empty: 'No match' };

const ITALIAN: PreviewTexts = { search: (folder) => `Cerca in ${folder}…`, never: 'mai aperto', empty: 'Nessun risultato' };

export class PreviewText {
  /**
   * @param locale A language tag such as `it` or `en-US`.
   * @returns The texts of the panel in that language; English when it is not known.
   */
  public static of(locale: string): PreviewTexts {
    return locale.toLowerCase().startsWith('it') ? ITALIAN : ENGLISH;
  }
}
