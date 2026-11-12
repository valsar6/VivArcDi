const LIST_KEY = "vivaldi.workspaces.list";
class WorkspaceNames {
  #prefs;
  #onChange;
  #logger;
  #workspaces = /* @__PURE__ */ new Map();
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
    const workspaces = await this.#read();
    if (!WorkspaceNames.#same(workspaces, this.#workspaces)) {
      this.#workspaces = workspaces;
      this.#onChange();
    }
  }
  /**
   * @returns The names of the workspaces Vivaldi lists, in its order.
   */
  get names() {
    return [...this.#workspaces.values()].map(({ name }) => name);
  }
  /**
   * @returns Every workspace Vivaldi lists, with its id, name and icon, in Vivaldi's order.
   */
  get entries() {
    return [...this.#workspaces].map(([id, entry]) => ({ id, ...entry }));
  }
  /**
   * @param workspaceId The id of a workspace, as `TabData.of` returns it, or null.
   * @returns Its name, or null for no workspace or an unknown one.
   */
  nameOf(workspaceId) {
    return workspaceId === null ? null : this.#workspaces.get(workspaceId)?.name ?? null;
  }
  /**
   * @param name The name of a workspace.
   * @returns Its id as `TabData.of` returns it, or null when no workspace has that name; the first one in Vivaldi's order when several do.
   */
  idOf(name) {
    return [...this.#workspaces].find(([, entry]) => entry.name === name)?.[0] ?? null;
  }
  /**
   * The format of the icon is not known: it is returned as Vivaldi stores it, and the caller
   * decides whether it can be shown.
   *
   * @param workspaceId The id of a workspace, as `TabData.of` returns it, or null.
   * @returns Its `icon` text, or null for no workspace, an unknown one or one without an icon.
   */
  iconOf(workspaceId) {
    return workspaceId === null ? null : this.#workspaces.get(workspaceId)?.icon ?? null;
  }
  static #same(left, right) {
    return left.size === right.size && [...left].every(([id, { name, icon, iconId }]) => right.get(id)?.name === name && right.get(id)?.icon === icon && right.get(id)?.iconId === iconId);
  }
  static #parse(value) {
    const workspaces = /* @__PURE__ */ new Map();
    for (const item of Array.isArray(value) ? value : []) {
      const entry = WorkspaceNames.#entry(item);
      if (entry !== null && !workspaces.has(entry.id)) {
        workspaces.set(entry.id, { name: entry.name, icon: entry.icon, iconId: entry.iconId });
      }
    }
    return workspaces;
  }
  static #text(value) {
    return typeof value === "string" && value !== "" ? value : null;
  }
  static #entry(item) {
    const { id, name, icon, iconId } = typeof item === "object" && item !== null ? item : {};
    return (typeof id === "number" || typeof id === "string") && typeof name === "string" ? { id: String(id), name, icon: WorkspaceNames.#text(icon), iconId: typeof iconId === "number" ? iconId : null } : null;
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
