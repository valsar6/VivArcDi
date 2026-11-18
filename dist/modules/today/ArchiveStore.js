import { StoredFormat } from "../../core/browser/StoredFormat.js";
const ARCHIVE_STORAGE_KEY = "vivarcdi.archive";
const isText = (value) => typeof value === "string";
const isTextOrNull = (value) => value === null || isText(value);
const FIELD_CHECKS = {
  url: isText,
  title: isText,
  favIconUrl: isTextOrNull,
  workspace: isTextOrNull,
  archivedAt: (value) => typeof value === "number" && Number.isFinite(value)
};
const isEntry = (value) => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const fields = value;
  return Object.entries(FIELD_CHECKS).every(([name, check]) => check(fields[name]));
};
const FORMAT = new StoredFormat({
  empty: [],
  read: (data) => {
    if (!Array.isArray(data)) {
      return null;
    }
    const valid = data.filter((entry) => isEntry(entry));
    return { value: valid, skipped: valid.length < data.length };
  }
});
class ArchiveStore {
  #storage;
  #limit;
  /**
   * The archive of closed Today tabs, newest first, kept in VivArcDi's shared storage so that it
   * survives a restart of Vivaldi.
   *
   * @param storage Persistent storage.
   * @param limit The most entries kept; older ones are dropped.
   */
  constructor(storage, limit) {
    this.#storage = storage;
    this.#limit = limit;
  }
  /**
   * @returns The entries, newest first, as saved now: a change made by another window shows.
   */
  get entries() {
    return this.#current();
  }
  /**
   * Reads the saved entries. Malformed ones are skipped.
   */
  load() {
    this.#current();
  }
  /**
   * Adds entries to what is saved now and saves the archive, dropping the oldest past the limit.
   * When the outcome is not `saved`, the entries are taken back out of the archive again.
   *
   * @param entries The entries to add.
   * @returns How the write ended; it never rejects.
   */
  async add(entries) {
    const added = ArchiveStore.#newestFirst([...entries, ...this.#current()]).slice(0, this.#limit);
    const outcome = await this.#storage.save(ARCHIVE_STORAGE_KEY, FORMAT.encode(added));
    if (outcome !== "saved") {
      this.#save(this.#current().filter((candidate) => !entries.some((entry) => ArchiveStore.#same(candidate, entry))));
    }
    return outcome;
  }
  /**
   * Removes one entry from what is saved now and saves the archive. The entry is matched by its
   * address, its time and its workspace.
   *
   * @param entry An entry as read from `entries`.
   */
  remove(entry) {
    this.#save(this.#current().filter((candidate) => !ArchiveStore.#same(candidate, entry)));
  }
  #save(entries) {
    this.#storage.setItem(ARCHIVE_STORAGE_KEY, FORMAT.encode(entries));
  }
  #current() {
    return ArchiveStore.#newestFirst(this.#storage.read(ARCHIVE_STORAGE_KEY, FORMAT).value).slice(0, this.#limit);
  }
  static #same(a, b) {
    return a.url === b.url && a.archivedAt === b.archivedAt && a.workspace === b.workspace;
  }
  static #newestFirst(entries) {
    return [...entries].sort((a, b) => b.archivedAt - a.archivedAt);
  }
}
export {
  ARCHIVE_STORAGE_KEY,
  ArchiveStore
};
