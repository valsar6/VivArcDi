const OUTSIDE_WORKSPACES = 'Tabs';

const RESERVED_NAMES: readonly string[] = ['Spaces', 'spaces', OUTSIDE_WORKSPACES];

export class SyncNames {
  /**
   * @param workspaceName The name of a workspace, or null for the area outside any workspace.
   * @returns The title of the subfolder that holds it in the sync store.
   */
  public static folderOf(workspaceName: string | null): string {
    return workspaceName ?? OUTSIDE_WORKSPACES;
  }

  /**
   * Names the sync store already uses for itself: `Spaces` is the folder of the workspace list,
   * `spaces` the key of its base, and `Tabs` the folder and key of the area outside any workspace.
   *
   * @param workspaceName The name of a workspace, compared exactly.
   * @returns Whether the name collides with a folder or key of the sync store, so the workspace cannot sync.
   */
  public static reserved(workspaceName: string): boolean {
    return RESERVED_NAMES.includes(workspaceName);
  }
}
