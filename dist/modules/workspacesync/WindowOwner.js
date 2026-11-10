class WindowOwner {
  #windows;
  /**
   * Every window runs the modules but only one may merge the pinned tabs, or two windows would
   * open the same tab twice. The owner is the normal window with the lowest id, chosen again each
   * time it is asked, so it passes to another window when the owner closes.
   *
   * @param windows Windows API.
   */
  constructor(windows) {
    this.#windows = windows;
  }
  /**
   * @returns The id of this window when it is the owner, otherwise null.
   */
  async ownId() {
    const [{ id }, ids] = await Promise.all([this.#windows.current(), this.#windows.normalIds()]);
    return id !== void 0 && ids[0] === id ? id : null;
  }
}
export {
  WindowOwner
};
