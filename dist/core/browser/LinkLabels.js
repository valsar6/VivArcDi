import { StoredFormat } from "./StoredFormat.js";
import { AddressKey } from "../tabs/AddressKey.js";
import { TabData } from "../tabs/TabData.js";
const LABELS_STORAGE_KEY = "vivarcdi.labels";
const MAX_DATA_ADDRESS = 8192;
const WEB_ADDRESS = /^https?:\/\//i;
const IMAGE_DATA_ADDRESS = /^data:image\//i;
const isText = (value) => typeof value === "string" && value !== "";
const isFavicon = (value) => typeof value === "string" && (WEB_ADDRESS.test(value) || IMAGE_DATA_ADDRESS.test(value) && value.length <= MAX_DATA_ADDRESS);
const iconOf = (value) => {
  const { emoji, symbol } = typeof value === "object" && value !== null ? value : {};
  if (isText(emoji)) {
    return { emoji };
  }
  return isText(symbol) ? { symbol } : void 0;
};
const PARSERS = {
  name: (value) => isText(value) ? value : void 0,
  icon: iconOf,
  favicon: (value) => isFavicon(value) ? value : void 0
};
const FIELDS = Object.keys(PARSERS);
const parseFields = (value) => {
  const entry = {};
  for (const field of FIELDS) {
    const raw = value[field];
    if (raw === void 0) {
      continue;
    }
    const parsed = PARSERS[field](raw);
    if (parsed === void 0) {
      return null;
    }
    entry[field] = parsed;
  }
  return Object.keys(entry).length > 0 ? entry : null;
};
const entryOf = (value) => typeof value === "object" && value !== null && !Array.isArray(value) ? parseFields(value) : null;
const FORMAT = new StoredFormat({
  empty: {},
  read: (data) => {
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      return null;
    }
    const entries = Object.entries(data).map(([key, value]) => [key, entryOf(value)]);
    const good = entries.filter((entry) => entry[1] !== null);
    return { value: Object.fromEntries(good), skipped: good.length < entries.length };
  }
});
class LabelKeys {
  /**
   * @param id The id of a bookmark.
   * @returns The key of the label of that saved row or bookmark tile.
   */
  static bookmark(id) {
    return `bookmark:${id}`;
  }
  /**
   * @param tab A pinned tab.
   * @returns The key of the label of the tile made from it, by the address key of its own page or
   * of the page it shows; null when the tab has no web address.
   */
  static page(tab) {
    const key = AddressKey.from(TabData.ownOf(tab).pinnedUrl ?? tab.url ?? tab.pendingUrl);
    return key === null ? null : `page:${key}`;
  }
}
class LinkLabels {
  static #instances = /* @__PURE__ */ new WeakMap();
  #storage;
  #logger;
  #labels;
  #listeners = /* @__PURE__ */ new Set();
  #warned = false;
  constructor(storage, logger) {
    this.#storage = storage;
    this.#logger = logger.child("labels");
    this.#labels = new Map(Object.entries(storage.read(LABELS_STORAGE_KEY, FORMAT).value));
  }
  /**
   * The labels of a window storage: one instance for each storage, so every module sees the
   * changes of the others.
   *
   * @param storage The window storage.
   * @param logger Reports a save that failed.
   * @returns The labels.
   */
  static of(storage, logger) {
    const known = LinkLabels.#instances.get(storage);
    if (known !== void 0) {
      return known;
    }
    const created = new LinkLabels(storage, logger);
    LinkLabels.#instances.set(storage, created);
    return created;
  }
  /**
   * @param key A label key.
   * @returns The label, or undefined when the link has none.
   */
  get(key) {
    return this.#labels.get(key);
  }
  /**
   * @returns A copy of every label, by key.
   */
  all() {
    return new Map(this.#labels);
  }
  /**
   * Changes a label and tells the listeners at once. A value that is not valid is refused and
   * leaves its field as it was: an empty text, an icon with neither emoji nor symbol, a favicon
   * that is not a web or image address or a `data:` address longer than 8 KB. An entry left with
   * nothing is dropped.
   *
   * @param key A label key.
   * @param change The fields to set or remove.
   * @param options `fromSync` marks a change that came from the sync, which is not written back.
   * @returns The outcome of the save; never throws.
   */
  async set(key, change, options = {}) {
    this.#store(key, LinkLabels.#merge(this.#labels.get(key), change));
    this.#notify({ key, fromSync: options.fromSync === true });
    return this.#save();
  }
  /**
   * Removes the whole label: name, icon and favicon.
   *
   * @param key A label key.
   * @returns The outcome of the save.
   */
  clear(key) {
    this.#labels.delete(key);
    this.#notify({ key, fromSync: false });
    return this.#save();
  }
  /**
   * Gives a link the whole label of another, as when a row is duplicated.
   *
   * @param fromKey The key to copy from; nothing happens when it has no label.
   * @param toKey The key that receives the copy.
   */
  async copy(fromKey, toKey) {
    const entry = this.#labels.get(fromKey);
    if (entry !== void 0) {
      this.#labels.set(toKey, { ...entry });
      this.#notify({ key: toKey, fromSync: false });
      await this.#save();
    }
  }
  /**
   * @param listener Called after every change.
   * @returns The function that stops the listener.
   */
  onChange(listener) {
    this.#listeners.add(listener);
    return () => void this.#listeners.delete(listener);
  }
  static #merge(current, change) {
    const merged = { ...current };
    for (const field of FIELDS) {
      const value = change[field];
      const parsed = value === void 0 || value === null ? void 0 : PARSERS[field](value);
      if (value === null) {
        delete merged[field];
      } else if (parsed !== void 0) {
        merged[field] = parsed;
      }
    }
    return merged;
  }
  #store(key, label) {
    if (Object.keys(label).length === 0) {
      this.#labels.delete(key);
    } else {
      this.#labels.set(key, label);
    }
  }
  #notify(event) {
    [...this.#listeners].forEach((listener) => listener(event));
  }
  async #save() {
    const outcome = await this.#storage.save(LABELS_STORAGE_KEY, FORMAT.encode(Object.fromEntries(this.#labels)));
    if (outcome === "failed" && !this.#warned) {
      this.#warned = true;
      this.#logger.warn("labels are kept for this session only");
    }
    return outcome;
  }
}
export {
  LABELS_STORAGE_KEY,
  LabelKeys,
  LinkLabels
};
