import { StoredFormat } from "../../core/browser/StoredFormat.js";
const KEY = "vivarcdi.little-arc.windows";
const KEPT = 20;
const FORMAT = new StoredFormat({
  empty: [],
  read: (data) => {
    if (!Array.isArray(data)) {
      return null;
    }
    const ids = data.filter((id) => Number.isInteger(id));
    return { value: ids, skipped: ids.length < data.length };
  }
});
class LittleArcRegistry {
  #storage;
  /**
   * Remembers which windows are Little Arc windows, so that a window opened by a website is never
   * mistaken for one. The list is shared by all windows through the persistent storage.
   *
   * @param storage Strings shared by all windows.
   */
  constructor(storage) {
    this.#storage = storage;
  }
  /**
   * @param windowId A window id.
   */
  mark(windowId) {
    const ids = this.#read().filter((id) => id !== windowId);
    ids.push(windowId);
    this.#storage.setItem(KEY, FORMAT.encode(ids.slice(-KEPT)));
  }
  /**
   * @param windowId A window id.
   * @returns Whether the window was marked as a Little Arc window.
   */
  has(windowId) {
    return this.#read().includes(windowId);
  }
  /**
   * @param windowId A window id.
   */
  unmark(windowId) {
    this.#storage.setItem(KEY, FORMAT.encode(this.#read().filter((id) => id !== windowId)));
  }
  #read() {
    return this.#storage.read(KEY, FORMAT).value;
  }
}
export {
  LittleArcRegistry
};
