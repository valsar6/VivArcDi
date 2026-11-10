const OUTSIDE_WORKSPACES = 'Tabs';

export class SyncNames {
  /**
   * @param workspaceName The name of a workspace, or null for the area outside any workspace.
   * @returns The title of the subfolder that holds it in the sync store.
   */
  public static folderOf(workspaceName: string | null): string {
    return workspaceName ?? OUTSIDE_WORKSPACES;
  }

  /**
   * @param workspaceNames The names of the workspaces that exist here.
   * @returns The folder titles of every area this computer can show: the workspaces and the one outside them.
   */
  public static known(workspaceNames: string[]): Set<string> {
    return new Set([OUTSIDE_WORKSPACES, ...workspaceNames]);
  }
}
