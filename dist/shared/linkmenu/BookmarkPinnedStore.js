class BookmarkPinnedStore {
  #deps;
  /**
   * The `Edit Pinned Page` store of 056 and 057: the page a saved link opens first is the address
   * of its bookmark, and the open tab is the one linked to that bookmark.
   *
   * @param dependencies The bookmark writer and the link that finds the open tab.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * @param id The bookmark id of the link.
   * @returns The address of the bookmark, if it has one.
   */
  async read(id) {
    return (await this.#deps.writer.get(id)).url;
  }
  /**
   * @param id The bookmark id of the link.
   * @param url The address the link opens first.
   */
  async write(id, url) {
    await this.#deps.writer.setUrl(id, url);
  }
  /**
   * @param id The bookmark id of the link.
   * @returns Its open tab, if it has one.
   */
  async tab(id) {
    return this.#deps.linkedTab.of(id);
  }
}
export {
  BookmarkPinnedStore
};
