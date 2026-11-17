const OUTSIDE_WORKSPACES = "Tabs";
const RESERVED_NAMES = ["Spaces", "spaces", OUTSIDE_WORKSPACES];
class SyncNames {
  /**
   * @param workspaceName The name of a workspace, or null for the area outside any workspace.
   * @returns The title of the subfolder that holds it in the sync store.
   */
  static folderOf(workspaceName) {
    return workspaceName ?? OUTSIDE_WORKSPACES;
  }
  /**
   * Names the sync store already uses for itself: `Spaces` is the folder of the workspace list,
   * `spaces` the key of its base, and `Tabs` the folder and key of the area outside any workspace.
   *
   * @param workspaceName The name of a workspace, compared exactly.
   * @returns Whether the name collides with a folder or key of the sync store, so the workspace cannot sync.
   */
  static reserved(workspaceName) {
    return RESERVED_NAMES.includes(workspaceName);
  }
}
export {
  SyncNames
};
