import { StoredFormat } from "../../core/browser/StoredFormat.js";
const LAST_OPENED_STORAGE_KEY = "vivarcdi.lastOpened";
const ONE_YEAR_MS = 31536e6;
const FORMAT = new StoredFormat({
  empty: {},
  read: (data) => {
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      return null;
    }
    const entries = Object.entries(data);
    const dates = entries.filter((entry) => typeof entry[1] === "number");
    return { value: Object.fromEntries(dates), skipped: dates.length < entries.length };
  }
});
class LastOpenedStore {
  #storage;
  #logger;
  #dates = /* @__PURE__ */ new Map();
  #warned = false;
  /**
   * Keeps the date each Favorite and pinned tab was last opened, by address key,
   * so the dates survive a restart of Vivaldi even though tab ids change.
   *
   * @param storage Persistent storage, or null to keep dates for the session only.
   * @param logger Logger for storage failures.
   */
  constructor(storage, logger) {
    this.#storage = storage;
    this.#logger = logger;
  }
  /**
   * Reads the saved dates, dropping those older than one year.
   *
   * @param now The current date.
   */
  load(now) {
    const saved = this.#storage?.read(LAST_OPENED_STORAGE_KEY, FORMAT).value ?? {};
    this.#dates = new Map(Object.entries(saved).filter((entry) => now.getTime() - entry[1] < ONE_YEAR_MS));
  }
  /**
   * @param key An address key.
   * @returns When that address was last opened, or null when it never was.
   */
  get(key) {
    const time = this.#dates.get(key);
    return time === void 0 ? null : new Date(time);
  }
  /**
   * Records that an address was opened, and saves every date.
   *
   * @param key An address key.
   * @param date When it was opened.
   */
  record(key, date) {
    this.#dates.set(key, date.getTime());
    this.#write();
  }
  #write() {
    try {
      this.#storage?.setItem(LAST_OPENED_STORAGE_KEY, FORMAT.encode(Object.fromEntries(this.#dates)));
    } catch (error) {
      this.#warnOnce(error);
    }
  }
  #warnOnce(error) {
    if (!this.#warned) {
      this.#warned = true;
      this.#logger.warn("last-opened dates are kept for this session only", error);
    }
  }
}
export {
  LAST_OPENED_STORAGE_KEY,
  LastOpenedStore
};
