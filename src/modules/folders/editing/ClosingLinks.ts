export class ClosingLinks {
  #ids = new Set<string>();

  /**
   * The links whose tabs are about to close because their folder is being deleted. The section
   * leaves the tabs of these links alone, so they do not flash back into today's list first.
   */
  constructor() {
    this.#ids.clear();
  }

  /**
   * @param ids Links whose tabs are about to close.
   */
  public add(ids: Iterable<string>): void {
    for (const id of ids) {
      this.#ids.add(id);
    }
  }

  /**
   * @param ids Links whose tabs are closed, or will not close after all.
   */
  public clear(ids: Iterable<string>): void {
    for (const id of ids) {
      this.#ids.delete(id);
    }
  }

  /**
   * @param id A link.
   * @returns Whether its tabs are about to close.
   */
  public has(id: string): boolean {
    return this.#ids.has(id);
  }
}
