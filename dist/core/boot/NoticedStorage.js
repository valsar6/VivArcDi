const STORAGE_MEMORY_KEY = "storage-memory";
const STORAGE_FAILED_KEY = "storage-failed";
const MEMORY_TEXT = "VivArcDi cannot save its data: changes last until Vivaldi restarts";
const FAILED_TEXT = "VivArcDi could not save its data: changes may be lost when Vivaldi restarts";
class NoticedStorage {
  #inner;
  #notices;
  /**
   * A storage that tells the user, once per session, when it cannot save.
   *
   * @param inner The storage that does the work.
   * @param notices Where the notices are shown.
   */
  constructor(inner, notices) {
    this.#inner = inner;
    this.#notices = notices;
  }
  /** @returns The mode of the inner storage. */
  get mode() {
    return this.#inner.mode;
  }
  /**
   * Shows the start notice when the storage works in memory only.
   */
  announce() {
    if (this.mode === "memory") {
      this.#notices.once(STORAGE_MEMORY_KEY, MEMORY_TEXT, "error");
    }
  }
  /**
   * @param key A key.
   * @returns The saved text, or null.
   */
  getItem(key) {
    return this.#inner.getItem(key);
  }
  /**
   * Saves a text and ignores the outcome; a failure still shows the notice.
   *
   * @param key A key.
   * @param value The text.
   */
  setItem(key, value) {
    void this.save(key, value);
  }
  /**
   * Saves a text and shows the failure notice the first time a write fails.
   *
   * @param key A key.
   * @param value The text.
   * @returns The outcome of the write.
   */
  async save(key, value) {
    const outcome = await this.#inner.save(key, value);
    if (outcome === "failed") {
      this.#notices.once(STORAGE_FAILED_KEY, FAILED_TEXT, "error");
    }
    return outcome;
  }
}
export {
  NoticedStorage
};
