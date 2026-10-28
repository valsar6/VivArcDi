import { BookmarkFolderFinder } from '../../core/bookmarks/BookmarkFolderFinder.js';
import type { Logger } from '../../core/Logger.js';

export class WorkspaceRoots {
  #root: string[];
  #byName = new Map<string, string[]>();

  /**
   * The root folder of each workspace, from the options `root` and `workspaces`. A workspace with
   * no entry, and the area outside any workspace, use `root`. An empty path means no folders. An
   * invalid `workspaces` is ignored and logged once.
   *
   * @param options The options of the module.
   * @param options.root The default root as a path of titles separated by `/`.
   * @param options.workspaces The map from a workspace name to its root path.
   * @param logger Logger for the invalid option.
   */
  constructor({ root, workspaces }: { root: unknown; workspaces: unknown }, logger: Logger) {
    this.#root = BookmarkFolderFinder.parsePath(typeof root === 'string' ? root : '');
    this.#byName = WorkspaceRoots.#parse(workspaces, logger);
  }

  /**
   * @param workspaceName The name of the active workspace, or null outside any workspace.
   * @returns The titles of its root folder; empty when no folders are shown.
   */
  public rootFor(workspaceName: string | null): string[] {
    return (workspaceName === null ? undefined : this.#byName.get(workspaceName)) ?? this.#root;
  }

  /**
   * @returns Every non-empty root that any workspace may show, without repeats.
   */
  public get allPaths(): string[][] {
    const paths = [this.#root, ...this.#byName.values()].filter((path) => path.length > 0);
    return paths.filter((path, index) => paths.findIndex((other) => other.join('/') === path.join('/')) === index);
  }

  static #parse(value: unknown, logger: Logger): Map<string, string[]> {
    if (value === undefined) {
      return new Map();
    }
    const entries = typeof value === 'object' && value !== null && !Array.isArray(value) ? Object.entries(value) : null;
    if (entries === null || !entries.every((entry): entry is [string, string] => typeof entry[1] === 'string')) {
      logger.warn('the option "workspaces" must map workspace names to text paths: it is ignored');
      return new Map();
    }
    return new Map(entries.map(([name, path]) => [name, BookmarkFolderFinder.parsePath(path)]));
  }
}
