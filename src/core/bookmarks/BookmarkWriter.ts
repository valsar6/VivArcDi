import { BookmarkFolderFinder } from './BookmarkFolderFinder.js';
import type { BookmarkNode } from './BookmarkNode.js';

export interface NewBookmark {
  /** The folder that receives it; omitted, Vivaldi uses its default folder. */
  parentId?: string | undefined;
  /** Position among the children of the folder; omitted, the end. */
  index?: number | undefined;
  title: string;
  /** Present for a link, absent for a folder. */
  url?: string | undefined;
}

export interface WritableBookmarksApi {
  getTree: (callback: (tree: BookmarkNode[]) => void) => void;
  getChildren: (id: string, callback: (children: BookmarkNode[]) => void) => void;
  create: (details: NewBookmark, callback: (node: BookmarkNode) => void) => void;
  update: (id: string, changes: { title: string }, callback: (node: BookmarkNode) => void) => void;
  remove: (id: string, callback: () => void) => void;
}

export interface WriterHost {
  bookmarks?: Partial<WritableBookmarksApi> | undefined;
  runtime?: { lastError?: { message?: string } | undefined } | undefined;
}

const METHODS = ['getTree', 'getChildren', 'create', 'update', 'remove'] as const;

export class BookmarkWriter {
  #chrome: WriterHost | null;
  #queue: Promise<unknown> = Promise.resolve();

  /**
   * The only class that creates, renames or deletes bookmarks. Every other class reads them through
   * `BrowserBookmarks`, which has no write method, so a view cannot change the bookmarks by mistake.
   *
   * @param chromeApi The global `chrome` object, or undefined where it does not exist.
   */
  constructor(chromeApi: WriterHost | undefined) {
    const api = chromeApi?.bookmarks;
    this.#chrome = chromeApi !== undefined && api !== undefined && METHODS.every((name) => typeof api[name] === 'function') ? chromeApi : null;
  }

  /**
   * @returns Whether `chrome.bookmarks` can write in this document.
   */
  public get available(): boolean {
    return this.#chrome !== null;
  }

  /**
   * @param details Where and what to create: a link when `url` is given, a folder otherwise.
   * @returns The new bookmark.
   */
  public create(details: NewBookmark): Promise<BookmarkNode> {
    return this.#call((api, done) => api.create(details, done));
  }

  /**
   * @param id The bookmark or folder.
   * @param title Its new name.
   * @returns The changed bookmark.
   */
  public update(id: string, title: string): Promise<BookmarkNode> {
    return this.#call((api, done) => api.update(id, { title }, done));
  }

  /**
   * @param id The link, or the empty folder, to delete.
   */
  public async remove(id: string): Promise<void> {
    await this.#call<void>((api, done) => api.remove(id, () => done()));
  }

  /**
   * @param id A folder.
   * @returns Its children, in Vivaldi's order.
   */
  public children(id: string): Promise<BookmarkNode[]> {
    return this.#call((api, done) => api.getChildren(id, done));
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
  public ensurePath(path: string[]): Promise<string> {
    const run = this.#queue.then(() => this.#ensure(path));
    this.#queue = run.catch(() => undefined);
    return run;
  }

  async #ensure(path: string[]): Promise<string> {
    if (path.length === 0) {
      throw new Error('a folder path needs at least one title');
    }
    const tree = await this.#call<BookmarkNode[]>((api, done) => api.getTree(done));
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
    if (parentId === undefined) {
      throw new Error('no folder was found or created');
    }
    return parentId;
  }

  async #folderIn(parentId: string | undefined, title: string): Promise<string> {
    const existing = parentId === undefined ? undefined : (await this.children(parentId)).find((child) => child.children !== undefined && child.title === title);
    return existing?.id ?? (await this.create({ parentId, title })).id;
  }

  #call<T>(run: (api: WritableBookmarksApi, done: (value: T) => void) => void): Promise<T> {
    const host = this.#chrome;
    const api = host?.bookmarks as WritableBookmarksApi | undefined;
    if (host === null || api === undefined) {
      return Promise.reject(new Error('chrome.bookmarks is not available'));
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
