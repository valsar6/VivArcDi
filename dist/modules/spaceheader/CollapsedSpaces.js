const COLLAPSED_SPACES_STORAGE_KEY = "vivarcdi.spaceCollapsed";
class CollapsedSpaces {
  #storage;
  #logger;
  #key = COLLAPSED_SPACES_STORAGE_KEY;
  #collapsed = false;
  /**
   * Whether the user left each workspace collapsed, kept in the interface's storage so it survives
   * a restart. Without storage the state is kept for the session only.
   *
   * @param storage Persistent storage, or null.
   * @param logger Logger for storage failures.
   */
  constructor(storage, logger) {
    this.#storage = storage;
    this.#logger = logger;
  }
  /**
   * @returns Whether the workspace in use is collapsed.
   */
  get collapsed() {
    return this.#collapsed;
  }
  /**
   * Switches to a workspace, each with its own saved state, and reads it.
   *
   * @param workspaceId The workspace id, or null for the area outside any workspace.
   */
  useWorkspace(workspaceId) {
    this.#key = workspaceId === null ? COLLAPSED_SPACES_STORAGE_KEY : `${COLLAPSED_SPACES_STORAGE_KEY}.${workspaceId}`;
    this.#collapsed = false;
    try {
      this.#collapsed = this.#storage?.getItem(this.#key) === "true";
    } catch (error) {
      this.#logger.warn("the collapsed state is kept for this session only", error);
    }
  }
  /**
   * Remembers the state of the workspace in use and saves it.
   *
   * @param collapsed Whether the workspace is collapsed.
   */
  save(collapsed) {
    this.#collapsed = collapsed;
    try {
      this.#storage?.setItem(this.#key, String(collapsed));
    } catch (error) {
      this.#logger.warn("the collapsed state is kept for this session only", error);
    }
  }
}
export {
  COLLAPSED_SPACES_STORAGE_KEY,
  CollapsedSpaces
};
