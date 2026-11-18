const RECOVERY_PREFIX = "vivarcdi.recovery.";
const KEY_PREFIX = "vivarcdi.";
const NEWER_KEY = "storage-newer";
const UNREADABLE_KEY = "storage-unreadable";
const NEWER_TEXT = "VivArcDi found data from a newer version: some changes will not be saved until you update VivArcDi";
const UNREADABLE_TEXT = "VivArcDi could not read some saved data and kept a copy of it";
class GuardedStorage {
  #inner;
  #notices;
  #logger;
  #held = /* @__PURE__ */ new Map();
  #pending = /* @__PURE__ */ new Map();
  #warned = /* @__PURE__ */ new Set();
  /**
   * A storage that reads JSON values through their formats, holds back writes to values from a
   * newer version and keeps a copy of a value it could not read before that value is replaced.
   *
   * @param inner The storage that does the work.
   * @param notices Where the notices are shown.
   * @param logger Where the warnings go.
   */
  constructor(inner, notices, logger) {
    this.#inner = inner;
    this.#notices = notices;
    this.#logger = logger;
  }
  /** @returns The mode of the inner storage. */
  get mode() {
    return this.#inner.mode;
  }
  /**
   * @param key A key under `vivarcdi.`.
   * @returns The key where a copy of its unreadable value is kept.
   */
  static recoveryKeyOf(key) {
    const name = key.startsWith(KEY_PREFIX) ? key.slice(KEY_PREFIX.length) : key;
    return `${RECOVERY_PREFIX}${name}`;
  }
  /**
   * @param key A key.
   * @returns What this window wrote to a key held read-only, else the saved text, or null.
   */
  getItem(key) {
    return this.#held.get(key) ?? this.#inner.getItem(key);
  }
  /**
   * Saves a text and ignores the outcome.
   *
   * @param key A key.
   * @param value The text.
   */
  setItem(key, value) {
    void this.save(key, value);
  }
  /**
   * Saves a text, unless the key holds data from a newer version: then the text stays in this
   * window only. An unreadable value is copied before its first replacement.
   *
   * @param key A key.
   * @param value The text.
   * @returns The outcome of the write.
   */
  save(key, value) {
    if (this.#held.has(key)) {
      this.#held.set(key, value);
      return Promise.resolve("memory");
    }
    this.#keepCopy(key);
    return this.#inner.save(key, value);
  }
  /**
   * Reads a JSON value. Writes nothing; a damaged or newer value is noted for the first write.
   *
   * @param key A key.
   * @param format The format of the value.
   * @returns What the key holds.
   */
  read(key, format) {
    const text = this.getItem(key);
    const result = format.decode(text);
    if (this.#held.has(key)) {
      return { ...result, status: "newer" };
    }
    this.#note(key, text, result);
    return result;
  }
  #note(key, text, result) {
    if (result.status === "newer") {
      this.#held.set(key, null);
      this.#notices.once(NEWER_KEY, NEWER_TEXT, "error");
      return;
    }
    if (text === null || result.status !== "unreadable" && !result.skipped) {
      return;
    }
    if (!this.#pending.has(key)) {
      this.#pending.set(key, text);
    }
    this.#warn(key);
    if (result.status === "unreadable") {
      this.#notices.once(UNREADABLE_KEY, UNREADABLE_TEXT, "error");
    }
  }
  #warn(key) {
    if (this.#warned.has(key)) {
      return;
    }
    this.#warned.add(key);
    this.#logger.warn(`could not read ${key}: its saved text goes to ${GuardedStorage.recoveryKeyOf(key)} before it is replaced`);
  }
  #keepCopy(key) {
    const text = this.#pending.get(key);
    if (text === void 0) {
      return;
    }
    this.#pending.delete(key);
    const recoveryKey = GuardedStorage.recoveryKeyOf(key);
    if (this.#inner.getItem(recoveryKey) === null) {
      this.#inner.setItem(recoveryKey, text);
    }
  }
}
export {
  GuardedStorage,
  RECOVERY_PREFIX
};
