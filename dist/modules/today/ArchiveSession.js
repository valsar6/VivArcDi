import { ArchiveSearch } from "./ArchiveSearch.js";
class ArchiveSession {
  #all;
  #query = "";
  #entries;
  #index = 0;
  /**
   * The state of the open archive panel: what was typed, which entries are left and which one is
   * highlighted.
   *
   * @param entries Every archive entry, newest first.
   */
  constructor(entries) {
    this.#all = entries;
    this.#entries = [...entries];
  }
  /**
   * @returns The entries left by the search, newest first.
   */
  get entries() {
    return this.#entries;
  }
  /**
   * @returns The position of the highlighted entry.
   */
  get highlighted() {
    return this.#index;
  }
  /**
   * Filters the entries and highlights the first one.
   *
   * @param query The text typed in the search field.
   */
  setQuery(query) {
    this.#query = query;
    this.#entries = ArchiveSearch.filter(this.#all, query);
    this.#index = 0;
  }
  /**
   * Replaces the entries, for example after more tabs were archived, keeping the search.
   *
   * @param entries Every archive entry, newest first.
   */
  reset(entries) {
    this.#all = entries;
    this.setQuery(this.#query);
  }
  /**
   * Moves the highlight, wrapping at the ends.
   *
   * @param step 1 for down, -1 for up.
   */
  move(step) {
    const count = this.#entries.length;
    this.#index = count === 0 ? 0 : (this.#index + step + count) % count;
  }
  /**
   * @param position A position in the entries, if not the highlighted one.
   * @returns The entry to restore, or null when nothing is left.
   */
  chosen(position = this.#index) {
    return this.#entries[position] ?? null;
  }
}
export {
  ArchiveSession
};
