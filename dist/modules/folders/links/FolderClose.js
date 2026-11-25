const RELEASE_DELAY_MS = 0;
class FolderClose {
  #closer;
  #openFolders;
  #redraw;
  #active;
  /**
   * Closes the tabs a row minus stands for, then closes the folder and redraws on success. The
   * shown workspace is held while the tabs close and for the task that follows, so the activation
   * Vivaldi performs on its own after a removal does not move it.
   *
   * @param closer The tab closer.
   * @param openFolders The folders whose state is saved.
   * @param redraw What to call once the tabs are gone.
   * @param active The workspace state, held for the length of the close.
   */
  constructor(closer, openFolders, redraw, active) {
    this.#closer = closer;
    this.#openFolders = openFolders;
    this.#redraw = redraw;
    this.#active = active;
  }
  /**
   * @param tabIds The tabs to close.
   * @param folderId The pressed folder, or undefined for a link row.
   * @param workspace The workspace shown when the press started.
   */
  async apply(tabIds, folderId, workspace) {
    this.#active.hold();
    try {
      if (!await this.#closer.close(tabIds)) {
        return;
      }
      if (folderId !== void 0) {
        this.#openFolders.forget(folderId, workspace);
      }
      this.#redraw();
    } finally {
      await new Promise((resolve) => setTimeout(resolve, RELEASE_DELAY_MS));
      this.#active.release();
    }
  }
}
export {
  FolderClose
};
