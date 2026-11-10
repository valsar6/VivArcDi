const OUTSIDE_WORKSPACES = "Tabs";
class SyncNames {
  /**
   * @param workspaceName The name of a workspace, or null for the area outside any workspace.
   * @returns The title of the subfolder that holds it in the sync store.
   */
  static folderOf(workspaceName) {
    return workspaceName ?? OUTSIDE_WORKSPACES;
  }
  /**
   * @param workspaceNames The names of the workspaces that exist here.
   * @returns The folder titles of every area this computer can show: the workspaces and the one outside them.
   */
  static known(workspaceNames) {
    return /* @__PURE__ */ new Set([OUTSIDE_WORKSPACES, ...workspaceNames]);
  }
}
export {
  SyncNames
};
