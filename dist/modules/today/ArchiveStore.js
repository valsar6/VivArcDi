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
class ArchiveStore {
  #storage;
  #limit;
  #logger;
  #warned = false;
  /**
   * The archive of closed Today tabs, newest first, kept in VivArcDi's shared storage so that it
   * survives a restart of Vivaldi.
   *
   * @param storage Persistent storage.
   * @param limit The most entries kept; older ones are dropped.
   * @param logger Logger for entries that cannot be read.
   */
  constructor(storage, limit, logger) {
    this.#storage = storage;
    this.#limit = limit;
    this.#logger = logger;
  }
  /**
   * @returns The entries, newest first, as saved now: a change made by another window shows.
   */
  get entries() {
    return this.#current();
  }
  /**
   * Reads the saved entries. Malformed ones are skipped, with one warning.
   */
  load() {
    this.#current();
  }
  /**
   * Adds entries to what is saved now and saves the archive, dropping the oldest past the limit.
   *
   * @param entries The entries to add.
   * @throws {Error} When the archive cannot be saved; nothing is added then.
   */
  add(entries) {
    this.#save(ArchiveStore.#newestFirst([...entries, ...this.#current()]).slice(0, this.#limit));
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
    this.#storage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(entries));
  }
  #current() {
    const saved = this.#read();
    const valid = saved.filter((entry) => ArchiveStore.#isEntry(entry));
    if (valid.length < saved.length && !this.#warned) {
      this.#warned = true;
      this.#logger.warn(`skipped ${saved.length - valid.length} malformed archive entries`);
    }
    return ArchiveStore.#newestFirst(valid).slice(0, this.#limit);
  }
  #read() {
    try {
      const parsed = JSON.parse(this.#storage.getItem(ARCHIVE_STORAGE_KEY) ?? "[]");
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      this.#logger.warn("the saved archive cannot be read", error);
      return [];
    }
  }
  static #same(a, b) {
    return a.url === b.url && a.archivedAt === b.archivedAt && a.workspace === b.workspace;
  }
  static #newestFirst(entries) {
    return [...entries].sort((a, b) => b.archivedAt - a.archivedAt);
  }
  static #isEntry(value) {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    const fields = value;
    return Object.entries(FIELD_CHECKS).every(([name, check]) => check(fields[name]));
  }
}
export {
  ARCHIVE_STORAGE_KEY,
  ArchiveStore
};
