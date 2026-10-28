const LIST_KEY = "vivaldi.workspaces.list";
class WorkspaceNames {
  #prefs;
  #onChange;
  #logger;
  #names = /* @__PURE__ */ new Map();
  #warned = false;
  #unsubscribe = null;
  /**
   * Knows the name of each workspace from Vivaldi's list of workspaces and follows renames and new
   * workspaces. When the list cannot be read, no workspace has a name and the problem is logged once.
   *
   * @param prefs Vivaldi's preferences.
   * @param onChange Called when the names change.
   * @param logger Logger for failures.
   */
  constructor(prefs, onChange, logger) {
    this.#prefs = prefs;
    this.#onChange = onChange;
    this.#logger = logger;
  }
  /**
   * @returns Whether a change of the list is announced; when false, call `refresh` on each workspace switch.
   */
  get following() {
    return this.#unsubscribe !== null;
  }
  /**
   * Reads the list and starts following it when Vivaldi announces its changes.
   */
  async start() {
    if (this.#prefs.available && this.#prefs.canFollow) {
      this.#unsubscribe = this.#prefs.onChange(LIST_KEY, () => void this.refresh());
    }
    await this.refresh();
  }
  /**
   * Stops following the list.
   */
  stop() {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }
  /**
   * Reads the list again and reports a change of names.
   */
  async refresh() {
    const names = await this.#read();
    if (!WorkspaceNames.#same(names, this.#names)) {
      this.#names = names;
      this.#onChange();
    }
  }
  /**
   * @param workspaceId The id of a workspace, as `TabData.of` returns it, or null.
   * @returns Its name, or null for no workspace or an unknown one.
   */
  nameOf(workspaceId) {
    return workspaceId === null ? null : this.#names.get(workspaceId) ?? null;
  }
  static #same(left, right) {
    return left.size === right.size && [...left].every(([id, name]) => right.get(id) === name);
  }
  static #parse(value) {
    const names = /* @__PURE__ */ new Map();
    for (const item of Array.isArray(value) ? value : []) {
      const entry = WorkspaceNames.#entry(item);
      if (entry !== null && !names.has(entry.id)) {
        names.set(entry.id, entry.name);
      }
    }
    return names;
  }
  static #entry(item) {
    const { id, name } = typeof item === "object" && item !== null ? item : {};
    return (typeof id === "number" || typeof id === "string") && typeof name === "string" ? { id: String(id), name } : null;
  }
  async #read() {
    if (!this.#prefs.available) {
      this.#warn("vivaldi.prefs is missing: every workspace uses the default root");
      return /* @__PURE__ */ new Map();
    }
    try {
      return WorkspaceNames.#parse(await this.#prefs.get(LIST_KEY));
    } catch (error) {
      this.#warn("could not read the workspaces: every workspace uses the default root", error);
      return /* @__PURE__ */ new Map();
    }
  }
  #warn(...message) {
    if (!this.#warned) {
      this.#warned = true;
      this.#logger.warn(...message);
    }
  }
}
export {
  WorkspaceNames
};
