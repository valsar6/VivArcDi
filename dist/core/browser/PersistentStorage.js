import { LocalSavingStorage } from "./LocalSavingStorage.js";
const KEY_PREFIX = "vivarcdi.";
const PROBE_KEY = "vivarcdi.probe";
class PersistentStorage {
  mode;
  #cache;
  #area;
  #host;
  #logger;
  #warned = false;
  #onChanged = (changes, areaName) => this.#follow(changes, areaName);
  /**
   * Strings that survive a restart of Vivaldi, readable and writable without waiting. Everything
   * VivArcDi saved is read once when it starts and kept in memory; a write changes the memory at
   * once and reaches `chrome.storage.local` right after. A change another window makes to
   * `chrome.storage.local` updates the memory too; that listener lives as long as the window.
   * Use `open`, which chooses the medium.
   *
   * @param initial What was saved before.
   * @param area The `chrome.storage.local` area to write to, or null to keep values in memory only.
   * @param host The `chrome` object, to read `runtime.lastError` after a write.
   * @param logger Logger for write failures.
   */
  constructor(initial, area, host, logger) {
    this.#cache = initial;
    this.mode = area === null ? "memory" : "persistent";
    this.#area = area;
    this.#host = host;
    this.#logger = logger;
    if (area !== null) {
      host?.storage?.onChanged?.addListener(this.#onChanged);
    }
  }
  /**
   * Opens the best storage the interface offers. Vivaldi 8.2's `window.html` has no usable
   * `localStorage`, so `chrome.storage.local` comes next; with neither, values live in memory
   * until Vivaldi restarts.
   *
   * @param document The browser window document.
   * @param chromeApi The global `chrome` object, if any.
   * @param logger Logger for failures.
   * @returns The storage to give to modules.
   */
  static async open(document, chromeApi, logger) {
    const local = PersistentStorage.#workingLocalStorage(document);
    if (local !== null) {
      return new LocalSavingStorage(local, logger);
    }
    const area = chromeApi?.storage?.local ?? null;
    if (area === null) {
      logger.warn("no persistent storage in this window: dates and folder states last until Vivaldi restarts");
      return new PersistentStorage(/* @__PURE__ */ new Map(), null, chromeApi, logger);
    }
    try {
      const items = await PersistentStorage.#read(area, chromeApi);
      return new PersistentStorage(items, area, chromeApi, logger);
    } catch (error) {
      logger.warn("chrome.storage.local cannot be read: dates and folder states last until Vivaldi restarts", error);
      return new PersistentStorage(/* @__PURE__ */ new Map(), null, chromeApi, logger);
    }
  }
  /**
   * @param key A key.
   * @returns The saved text, or null.
   */
  getItem(key) {
    return this.#cache.get(key) ?? null;
  }
  /**
   * Saves a text, ignoring the outcome: in memory now, in `chrome.storage.local` right after.
   *
   * @param key A key.
   * @param value The text.
   */
  setItem(key, value) {
    void this.save(key, value);
  }
  /**
   * Saves a text: in memory now, in `chrome.storage.local` right after. A failed write keeps the
   * value in memory.
   *
   * @param key A key.
   * @param value The text.
   * @returns `saved` when the write is confirmed, `failed` when it is refused or throws, `memory`
   * when there is no area; never rejects.
   */
  save(key, value) {
    this.#cache.set(key, value);
    const area = this.#area;
    if (area === null) {
      return Promise.resolve("memory");
    }
    return new Promise((resolve) => {
      try {
        area.set({ [key]: value }, () => {
          const error = this.#host?.runtime?.lastError;
          if (error) {
            this.#warn(new Error(error.message));
            resolve("failed");
            return;
          }
          resolve("saved");
        });
      } catch (error) {
        this.#warn(error);
        resolve("failed");
      }
    });
  }
  static #workingLocalStorage(document) {
    try {
      const storage = document.defaultView?.localStorage ?? null;
      storage?.setItem(PROBE_KEY, "1");
      storage?.removeItem(PROBE_KEY);
      return storage;
    } catch {
      return null;
    }
  }
  static #read(area, host) {
    return new Promise((resolve, reject) => {
      area.get(null, (items) => {
        const error = host?.runtime?.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        const saved = Object.entries(items ?? {}).filter((entry) => entry[0].startsWith(KEY_PREFIX) && typeof entry[1] === "string");
        resolve(new Map(saved));
      });
    });
  }
  #follow(changes, areaName) {
    if (areaName !== "local") {
      return;
    }
    for (const [key, change] of Object.entries(changes)) {
      if (!key.startsWith(KEY_PREFIX)) {
        continue;
      }
      if (change.newValue === void 0) {
        this.#cache.delete(key);
      } else if (typeof change.newValue === "string") {
        this.#cache.set(key, change.newValue);
      }
    }
  }
  #warn(error) {
    if (!this.#warned) {
      this.#warned = true;
      this.#logger.warn("could not save to chrome.storage.local: values last until Vivaldi restarts", error);
    }
  }
}
export {
  PersistentStorage
};
