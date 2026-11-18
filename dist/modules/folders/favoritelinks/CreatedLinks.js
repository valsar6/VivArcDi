import { StoredFormat } from "../../../core/browser/StoredFormat.js";
const KEY = "vivarcdi.createdLinks";
const FORMAT = new StoredFormat({
  empty: [],
  read: (data) => {
    if (!Array.isArray(data)) {
      return null;
    }
    const ids = data.filter((id) => typeof id === "string");
    return { value: ids, skipped: ids.length < data.length };
  }
});
class CreatedLinks {
  #storage;
  /**
   * The ids of the bookmarks VivArcDi made when a tab was added to the workspace favorites, kept
   * after a restart. Only those are removed when the tab is taken back, so a bookmark the user made
   * is never deleted.
   *
   * @param storage Strings that survive a restart.
   */
  constructor(storage) {
    this.#storage = storage;
  }
  /**
   * @param bookmarkId A bookmark.
   * @returns Whether VivArcDi created it.
   */
  has(bookmarkId) {
    return this.#read().has(bookmarkId);
  }
  /**
   * @param bookmarkId A bookmark VivArcDi just created.
   */
  add(bookmarkId) {
    this.#write(this.#read().add(bookmarkId));
  }
  /**
   * @param bookmarkId A bookmark that no longer exists, or that is no longer VivArcDi's.
   */
  remove(bookmarkId) {
    const ids = this.#read();
    if (ids.delete(bookmarkId)) {
      this.#write(ids);
    }
  }
  #read() {
    return new Set(this.#storage.read(KEY, FORMAT).value);
  }
  #write(ids) {
    this.#storage.setItem(KEY, FORMAT.encode([...ids]));
  }
}
export {
  CreatedLinks
};
