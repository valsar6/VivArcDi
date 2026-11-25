class FolderClose {
  #closer;
  #openFolders;
  #redraw;
  /**
   * Closes the tabs a row minus stands for, then closes the folder and redraws on success.
   *
   * @param closer The tab closer.
   * @param openFolders The folders whose state is saved.
   * @param redraw What to call once the tabs are gone.
   */
  constructor(closer, openFolders, redraw) {
    this.#closer = closer;
    this.#openFolders = openFolders;
    this.#redraw = redraw;
  }
  /**
   * @param tabIds The tabs to close.
   * @param folderId The pressed folder, or undefined for a link row.
   */
  async apply(tabIds, folderId) {
    if (!await this.#closer.close(tabIds)) {
      return;
    }
    if (folderId !== void 0) {
      this.#openFolders.forget(folderId);
    }
    this.#redraw();
  }
}
export {
  FolderClose
};
