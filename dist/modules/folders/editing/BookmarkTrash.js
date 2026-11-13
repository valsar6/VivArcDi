class BookmarkTrash {
  #source;
  #id = null;
  /**
   * Finds Vivaldi's bookmark Trash: the top-level node whose `trash` flag is true. The id is read
   * once and kept for the session.
   *
   * @param source Where the bookmark tree comes from.
   */
  constructor(source) {
    this.#source = source;
  }
  /**
   * @returns The id of the Trash, or null when the tree has none.
   */
  async id() {
    if (this.#id === null) {
      const top = (await this.#source.tree()).flatMap((root) => root.children ?? []);
      this.#id = top.find((node) => node.trash === true)?.id ?? null;
    }
    return this.#id;
  }
}
export {
  BookmarkTrash
};
