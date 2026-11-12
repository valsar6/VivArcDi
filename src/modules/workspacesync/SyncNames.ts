const OUTSIDE_WORKSPACES = 'Tabs';

export class SyncNames {
  /**
   * @param workspaceName The name of a workspace, or null for the area outside any workspace.
   * @returns The title of the subfolder that holds it in the sync store.
   */
  public static folderOf(workspaceName: string | null): string {
    return workspaceName ?? OUTSIDE_WORKSPACES;
  }
}
