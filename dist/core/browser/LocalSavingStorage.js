class LocalSavingStorage {
  mode = "persistent";
  #storage;
  #logger;
  #warned = false;
  /**
   * Adapts a working `localStorage` to `SavingStorage`.
   *
   * @param storage A `Storage` that accepted a probe write.
   * @param logger Logger for write failures.
   */
  constructor(storage, logger) {
    this.#storage = storage;
    this.#logger = logger;
  }
  /**
   * @param key A key.
   * @returns The saved text, or null.
   */
  getItem(key) {
    return this.#storage.getItem(key);
  }
  /**
   * Saves a text, ignoring the outcome.
   *
   * @param key A key.
   * @param value The text.
   */
  setItem(key, value) {
    void this.save(key, value);
  }
  /**
   * @param key A key.
   * @param value The text.
   * @returns `saved`, or `failed` when the write throws (for example a full quota).
   */
  save(key, value) {
    try {
      this.#storage.setItem(key, value);
      return Promise.resolve("saved");
    } catch (error) {
      if (!this.#warned) {
        this.#warned = true;
        this.#logger.warn("could not save to localStorage: values last until Vivaldi restarts", error);
      }
      return Promise.resolve("failed");
    }
  }
}
export {
  LocalSavingStorage
};
