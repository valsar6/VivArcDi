import { BookmarkFolderFinder } from "./BookmarkFolderFinder.js";
const METHODS = ["getTree", "getChildren", "create", "update", "remove", "removeTree", "get", "getSubTree", "move"];
class BookmarkWriter {
  #chrome;
  #queue = Promise.resolve();
  /**
   * The only class that creates, renames or deletes bookmarks. Every other class reads them through
   * `BrowserBookmarks`, which has no write method, so a view cannot change the bookmarks by mistake.
   *
   * @param chromeApi The global `chrome` object, or undefined where it does not exist.
   */
  constructor(chromeApi) {
    const api = chromeApi?.bookmarks;
    this.#chrome = chromeApi !== void 0 && api !== void 0 && METHODS.every((name) => typeof api[name] === "function") ? chromeApi : null;
  }
  /**
   * @returns Whether `chrome.bookmarks` can write in this document.
   */
  get available() {
    return this.#chrome !== null;
  }
  /**
   * @param details Where and what to create: a link when `url` is given, a folder otherwise.
   * @returns The new bookmark.
   */
  create(details) {
    return this.#call((api, done) => api.create(details, done));
  }
  /**
   * @param id The bookmark or folder.
   * @param title Its new name.
   * @returns The changed bookmark.
   */
  update(id, title) {
    return this.#call((api, done) => api.update(id, { title }, done));
  }
  /**
   * @param id The bookmark or folder.
   * @param description Its new free text, as Vivaldi keeps it.
   * @returns The changed bookmark.
   */
  describe(id, description) {
    return this.#call((api, done) => api.update(id, { description }, done));
  }
  /**
   * @param id The bookmark or folder.
   * @param destination The folder and the position it goes to.
   * @returns The moved bookmark.
   */
  move(id, destination) {
    return this.#call((api, done) => api.move(id, destination, done));
  }
  /**
   * @param id The link, or the empty folder, to delete.
   */
  async remove(id) {
    await this.#call((api, done) => api.remove(id, () => done()));
  }
  /**
   * @param id A folder and everything in it.
   */
  async removeTree(id) {
    await this.#call((api, done) => api.removeTree(id, () => done()));
  }
  /**
   * @param id A bookmark or folder.
   * @returns The bookmark, without its children.
   */
  async get(id) {
    return BookmarkWriter.#first(id, await this.#call((api, done) => api.get(id, done)));
  }
  /**
   * @param id A bookmark or folder.
   * @returns It with all its descendants, in Vivaldi's order.
   */
  async subTree(id) {
    return BookmarkWriter.#first(id, await this.#call((api, done) => api.getSubTree(id, done)));
  }
  /**
   * @returns The whole bookmark tree, from its top-level nodes.
   */
  tree() {
    return this.#call((api, done) => api.getTree(done));
  }
  /**
   * @param id A folder.
   * @returns Its children, in Vivaldi's order.
   */
  children(id) {
    return this.#call((api, done) => api.getChildren(id, done));
  }
  /**
   * @param path The titles of a folder, from the top.
   * @param id A bookmark or folder.
   * @returns Whether the folder exists and holds it, at any depth.
   */
  async contains(path, id) {
    const tree = await this.#call((api, done) => api.getTree(done));
    const folder = BookmarkFolderFinder.find(tree, path);
    const holds = (nodes) => nodes.some((node) => node.id === id || holds(node.children ?? []));
    return folder !== null && holds(folder.children ?? []);
  }
  /**
   * Finds the folder at the end of a path of titles and creates the missing ones, one level at a
   * time, so `VivArcDi/Casetta` makes both when neither exists. The part of the path that exists
   * is found like the section finds a root, anywhere in the tree; the first missing folder goes
   * to Vivaldi's default folder. Calls run one after the other, so two writes never create the
   * same folder twice.
   *
   * @param path Titles from the outer folder to the wanted one; not empty.
   * @returns The id of the last folder.
   */
  ensurePath(path) {
    const run = this.#queue.then(() => this.#ensure(path));
    this.#queue = run.catch(() => void 0);
    return run;
  }
  async #ensure(path) {
    if (path.length === 0) {
      throw new Error("a folder path needs at least one title");
    }
    const tree = await this.#call((api, done) => api.getTree(done));
    let known = path.length;
    let parent = BookmarkFolderFinder.find(tree, path);
    while (parent === null && known > 1) {
      known -= 1;
      parent = BookmarkFolderFinder.find(tree, path.slice(0, known));
    }
    if (parent === null) {
      known = 0;
    }
    let parentId = parent?.id;
    for (const title of path.slice(known)) {
      parentId = await this.#folderIn(parentId, title);
    }
    if (parentId === void 0) {
      throw new Error("no folder was found or created");
    }
    return parentId;
  }
  async #folderIn(parentId, title) {
    const existing = parentId === void 0 ? void 0 : (await this.children(parentId)).find((child) => child.children !== void 0 && child.title === title);
    return existing?.id ?? (await this.create({ parentId, title })).id;
  }
  static #first(id, nodes) {
    const node = nodes[0];
    if (node === void 0) {
      throw new Error(`bookmark ${id} was not found`);
    }
    return node;
  }
  #call(run) {
    const host = this.#chrome;
    const api = host?.bookmarks;
    if (host === null || api === void 0) {
      return Promise.reject(new Error("chrome.bookmarks is not available"));
    }
    return new Promise((resolve, reject) => {
      run(api, (value) => {
        const error = host.runtime?.lastError;
        if (error) {
          reject(new Error(error.message));
        } else {
          resolve(value);
        }
      });
    });
  }
}
export {
  BookmarkWriter
};
