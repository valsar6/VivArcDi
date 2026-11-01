import { BookmarkFolderFinder } from '../../core/bookmarks/BookmarkFolderFinder.js';
import type { Logger } from '../../core/Logger.js';

const DEFAULT_BASE = 'VivArcDi';
const OUTSIDE_NAME = 'Tabs';

export class WorkspaceRoots {
  #root: string[];
  #base: string[];
  #byName = new Map<string, string[]>();

  /**
   * The root folder of each workspace, from the options `workspaces`, `root` and `workspacesBase`.
   * A workspace with an entry uses it; an empty entry means no folders. A workspace with no entry
   * uses `root` when it is not empty, else a folder named after it inside the base folder. The
   * area outside any workspace uses `root`, else `<base>/Tabs`. An invalid `workspaces` is ignored
   * and logged once.
   *
   * @param options The options of the module.
   * @param options.root The default root as a path of titles separated by `/`.
   * @param options.workspaces The map from a workspace name to its root path.
   * @param options.workspacesBase The folder that holds the default folder of each workspace; `VivArcDi` when missing or empty.
   * @param logger Logger for the invalid option.
   */
  constructor({ root, workspaces, workspacesBase }: { root: unknown; workspaces: unknown; workspacesBase?: unknown }, logger: Logger) {
    this.#root = BookmarkFolderFinder.parsePath(typeof root === 'string' ? root : '');
    const base = BookmarkFolderFinder.parsePath(typeof workspacesBase === 'string' ? workspacesBase : '');
    this.#base = base.length > 0 ? base : [DEFAULT_BASE];
    this.#byName = WorkspaceRoots.#parse(workspaces, logger);
  }

  /**
   * @param workspaceName The name of the active workspace, or null outside any workspace.
   * @returns The titles of its root folder, which may not exist yet; empty when no folders are shown.
   */
  public rootFor(workspaceName: string | null): string[] {
    const configured = workspaceName === null ? undefined : this.#byName.get(workspaceName);
    if (configured !== undefined) {
      return configured;
    }
    return this.#root.length > 0 ? this.#root : [...this.#base, WorkspaceRoots.#folderName(workspaceName)];
  }

  /**
   * @returns Every non-empty root written in the options, without repeats.
   */
  public get allPaths(): string[][] {
    return WorkspaceRoots.#distinct([this.#root, ...this.#byName.values()]);
  }

  /**
   * @param workspaceNames The names of the workspaces that exist; null stands for the area outside any workspace.
   * @returns The non-empty root of each of them, without repeats.
   */
  public pathsFor(workspaceNames: Array<string | null>): string[][] {
    return WorkspaceRoots.#distinct(workspaceNames.map((name) => this.rootFor(name)));
  }

  static #folderName(workspaceName: string | null): string {
    const name = workspaceName?.trim() ?? '';
    return name === '' ? OUTSIDE_NAME : name;
  }

  static #distinct(paths: string[][]): string[][] {
    const filled = paths.filter((path) => path.length > 0);
    return filled.filter((path, index) => filled.findIndex((other) => other.join('/') === path.join('/')) === index);
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
