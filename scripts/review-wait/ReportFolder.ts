export interface ReportFolderOptions {
  out: string | null;
  root: string;
  exists: (path: string) => boolean;
  day: string;
}

export class ReportFolder {
  /**
   * Says where the report of the day is written.
   *
   * @param options `out` is the folder asked for, `root` the repository root, `exists` tells whether a path exists and `day` is `YYYY-MM-DD`.
   * @returns The file path: `out`, else `.claude/review-wait` when `.claude` exists, else `build/review-wait`.
   */
  public static resolve(options: ReportFolderOptions): string {
    return `${ReportFolder.#directory(options)}/${options.day}.md`;
  }

  static #directory({ out, root, exists }: ReportFolderOptions): string {
    if (out !== null) {
      return out;
    }
    return exists(`${root}/.claude`) ? `${root}/.claude/review-wait` : `${root}/build/review-wait`;
  }
}
