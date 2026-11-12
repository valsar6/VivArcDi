import type { PullRequestRow } from './GithubPullRequests.js';

export interface ArchiveResult {
  /** The rows that stay in the folder. */
  rows: PullRequestRow[];
  /** The archive after the pull requests that came back or left were forgotten. */
  archived: Record<string, string>;
}

export class ArchivedPullRequests {
  /**
   * Hides the pull requests the user archived until they are updated on GitHub. A pull request
   * whose `updatedAt` is newer than the value kept comes back and leaves the archive; so does an
   * id that is no longer in GitHub's answer, such as a pull request that closed.
   *
   * @param rows The rows of a refresh.
   * @param archived The archive of the folder: id and the `updatedAt` it had when archived.
   * @returns The rows to show and the archive to keep.
   */
  public static apply(rows: PullRequestRow[], archived: Record<string, string>): ArchiveResult {
    const kept: Record<string, string> = {};
    const shown = rows.filter((row) => {
      const since = archived[row.id];
      if (since === undefined || row.updatedAt > since) {
        return true;
      }
      kept[row.id] = since;
      return false;
    });
    return { rows: shown, archived: kept };
  }
}
