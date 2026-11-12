const OUTSIDE_WORKSPACES = "Tabs";
class SyncNames {
  /**
   * @param workspaceName The name of a workspace, or null for the area outside any workspace.
   * @returns The title of the subfolder that holds it in the sync store.
   */
  static folderOf(workspaceName) {
    return workspaceName ?? OUTSIDE_WORKSPACES;
  }
}
export {
  SyncNames
};
