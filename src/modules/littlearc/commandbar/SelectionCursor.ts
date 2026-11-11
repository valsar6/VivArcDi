/**
 * The selected row of a list. It moves up and down, wraps around at both ends and goes back to the
 * first row when the list changes.
 */
export class SelectionCursor {
  #index = 0;
  #size = 0;

  /**
   * @returns The selected row, 0 when the list is empty.
   */
  public get index(): number {
    return this.#index;
  }

  /**
   * Tells the cursor the list changed: it goes back to the first row.
   *
   * @param size How many rows the list has.
   */
  public reset(size: number): void {
    this.#size = Math.max(0, size);
    this.#index = 0;
  }

  /**
   * Moves to the previous row, from the first to the last.
   */
  public up(): void {
    this.#move(-1);
  }

  /**
   * Moves to the next row, from the last to the first.
   */
  public down(): void {
    this.#move(1);
  }

  /**
   * Selects a row, as the pointer does; an index outside the list is ignored.
   *
   * @param index The row.
   */
  public select(index: number): void {
    if (Number.isInteger(index) && index >= 0 && index < this.#size) {
      this.#index = index;
    }
  }

  #move(step: number): void {
    if (this.#size > 0) {
      this.#index = (this.#index + step + this.#size) % this.#size;
    }
  }
}
