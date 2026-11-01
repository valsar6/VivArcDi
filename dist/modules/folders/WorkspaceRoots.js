import { BookmarkFolderFinder } from "../../core/bookmarks/BookmarkFolderFinder.js";
const DEFAULT_BASE = "VivArcDi";
const OUTSIDE_NAME = "Tabs";
class WorkspaceRoots {
  #root;
  #base;
  #byName = /* @__PURE__ */ new Map();
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
  constructor({ root, workspaces, workspacesBase }, logger) {
    this.#root = BookmarkFolderFinder.parsePath(typeof root === "string" ? root : "");
    const base = BookmarkFolderFinder.parsePath(typeof workspacesBase === "string" ? workspacesBase : "");
    this.#base = base.length > 0 ? base : [DEFAULT_BASE];
    this.#byName = WorkspaceRoots.#parse(workspaces, logger);
  }
  /**
   * @param workspaceName The name of the active workspace, or null outside any workspace.
   * @returns The titles of its root folder, which may not exist yet; empty when no folders are shown.
   */
  rootFor(workspaceName) {
    const configured = workspaceName === null ? void 0 : this.#byName.get(workspaceName);
    if (configured !== void 0) {
      return configured;
    }
    return this.#root.length > 0 ? this.#root : [...this.#base, WorkspaceRoots.#folderName(workspaceName)];
  }
  /**
   * @returns Every non-empty root written in the options, without repeats.
   */
  get allPaths() {
    return WorkspaceRoots.#distinct([this.#root, ...this.#byName.values()]);
  }
  /**
   * @param workspaceNames The names of the workspaces that exist; null stands for the area outside any workspace.
   * @returns The non-empty root of each of them, without repeats.
   */
  pathsFor(workspaceNames) {
    return WorkspaceRoots.#distinct(workspaceNames.map((name) => this.rootFor(name)));
  }
  static #folderName(workspaceName) {
    const name = workspaceName?.trim() ?? "";
    return name === "" ? OUTSIDE_NAME : name;
  }
  static #distinct(paths) {
    const filled = paths.filter((path) => path.length > 0);
    return filled.filter((path, index) => filled.findIndex((other) => other.join("/") === path.join("/")) === index);
  }
  static #parse(value, logger) {
    if (value === void 0) {
      return /* @__PURE__ */ new Map();
    }
    const entries = typeof value === "object" && value !== null && !Array.isArray(value) ? Object.entries(value) : null;
    if (entries === null || !entries.every((entry) => typeof entry[1] === "string")) {
      logger.warn('the option "workspaces" must map workspace names to text paths: it is ignored');
      return /* @__PURE__ */ new Map();
    }
    return new Map(entries.map(([name, path]) => [name, BookmarkFolderFinder.parsePath(path)]));
  }
}
export {
  WorkspaceRoots
};
