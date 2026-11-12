const KEY = "vivarcdi.sync.spaceIds";
class SpaceIds {
  #storage;
  #generate;
  /**
   * Links the id Vivaldi gave a workspace on this computer to its sync id, the random id that names
   * the workspace in the sync store on every computer. A workspace that another computer removed
   * from the store is detached: it stays here, unlinked, until the user renames it.
   *
   * @param storage Where the links are kept.
   * @param generate Makes a new sync id, replaceable in tests.
   */
  constructor(storage, generate = () => crypto.randomUUID()) {
    this.#storage = storage;
    this.#generate = generate;
  }
  /**
   * @returns A new random sync id.
   */
  fresh() {
    return this.#generate();
  }
  /**
   * @param vivaldiId The id of a workspace here.
   * @returns Its sync id, or null when it is not linked.
   */
  syncIdOf(vivaldiId) {
    const link = this.#all()[vivaldiId];
    return typeof link === "string" ? link : null;
  }
  /**
   * @param vivaldiId The id of a workspace here.
   * @param name Its name now.
   * @returns Whether it was detached and still has the name it had then.
   */
  isDetached(vivaldiId, name) {
    const link = this.#all()[vivaldiId];
    return typeof link === "object" && link.detached === name;
  }
  /**
   * @param vivaldiId The id of a workspace here.
   * @param syncId The sync id it now has.
   */
  link(vivaldiId, syncId) {
    this.#save({ ...this.#all(), [vivaldiId]: syncId });
  }
  /**
   * Forgets the link of a workspace that the store no longer lists, so the workspace stays here and
   * is not added to the store again unless its name changes.
   *
   * @param vivaldiId The id of a workspace here.
   * @param name Its name now.
   */
  detach(vivaldiId, name) {
    this.#save({ ...this.#all(), [vivaldiId]: { detached: name } });
  }
  #all() {
    try {
      const parsed = JSON.parse(this.#storage.getItem(KEY) ?? "{}");
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  #save(links) {
    const text = JSON.stringify(links);
    if (this.#storage.getItem(KEY) !== text) {
      this.#storage.setItem(KEY, text);
    }
  }
}
export {
  SpaceIds
};
