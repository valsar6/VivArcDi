const ANNOUNCED_KEY = "vivarcdi.sync.announced";
class MissingSpaces {
  #storage;
  #notify;
  /**
   * Names the workspaces of the sync store that this computer lacks, once each, so the user can
   * create them with the same name. A name already shown stays quiet, also after a restart.
   *
   * @param storage Where the shown names are kept.
   * @param notify Shows the message.
   */
  constructor(storage, notify) {
    this.#storage = storage;
    this.#notify = notify;
  }
  /**
   * @param names The workspace names the store has and this computer lacks.
   */
  announce(names) {
    const shown = this.#shown();
    const fresh = names.filter((name) => !shown.includes(name));
    if (fresh.length > 0) {
      this.#storage.setItem(ANNOUNCED_KEY, JSON.stringify([...shown, ...fresh]));
      this.#notify(`Spaces from your other computers: ${fresh.join(", ")}. Create them with the same name to get their pinned tabs.`);
    }
  }
  #shown() {
    try {
      const parsed = JSON.parse(this.#storage.getItem(ANNOUNCED_KEY) ?? "[]");
      return Array.isArray(parsed) ? parsed.filter((name) => typeof name === "string") : [];
    } catch {
      return [];
    }
  }
}
export {
  MissingSpaces
};
