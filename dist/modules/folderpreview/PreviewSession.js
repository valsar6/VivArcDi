import { PreviewRows } from "./PreviewRows.js";
class PreviewSession {
  #all;
  #rows;
  #index = 0;
  /**
   * The state of an open panel: what was typed, which rows are left and which one is highlighted.
   *
   * @param rows All rows of the folder, already sorted.
   */
  constructor(rows) {
    this.#all = rows;
    this.#rows = rows;
  }
  /**
   * @returns The rows left by the search.
   */
  get rows() {
    return this.#rows;
  }
  /**
   * @returns The position of the highlighted row.
   */
  get highlighted() {
    return this.#index;
  }
  /**
   * Filters the rows and highlights the first one.
   *
   * @param query The text typed in the search field.
   */
  setQuery(query) {
    this.#rows = PreviewRows.filter(this.#all, query);
    this.#index = 0;
  }
  /**
   * Moves the highlight, wrapping at the ends.
   *
   * @param step 1 for down, -1 for up.
   */
  move(step) {
    const count = this.#rows.length;
    this.#index = count === 0 ? 0 : (this.#index + step + count) % count;
  }
  /**
   * @param position A position in the rows, if not the highlighted one.
   * @returns The row to activate, or null when nothing is left.
   */
  activate(position = this.#index) {
    return this.#rows[position] ?? null;
  }
}
export {
  PreviewSession
};
