class SelectionCursor {
  #index = 0;
  #size = 0;
  /**
   * @returns The selected row, 0 when the list is empty.
   */
  get index() {
    return this.#index;
  }
  /**
   * Tells the cursor the list changed: it goes back to the first row.
   *
   * @param size How many rows the list has.
   */
  reset(size) {
    this.#size = Math.max(0, size);
    this.#index = 0;
  }
  /**
   * Moves to the previous row, from the first to the last.
   */
  up() {
    this.#move(-1);
  }
  /**
   * Moves to the next row, from the last to the first.
   */
  down() {
    this.#move(1);
  }
  /**
   * Selects a row, as the pointer does; an index outside the list is ignored.
   *
   * @param index The row.
   */
  select(index) {
    if (Number.isInteger(index) && index >= 0 && index < this.#size) {
      this.#index = index;
    }
  }
  #move(step) {
    if (this.#size > 0) {
      this.#index = (this.#index + step + this.#size) % this.#size;
    }
  }
}
export {
  SelectionCursor
};
