import { BookmarkFolderFinder } from '../../core/bookmarks/BookmarkFolderFinder.js';
import type { BookmarkNode } from '../../core/bookmarks/BookmarkNode.js';
import type { BrowserBookmarks } from '../../core/bookmarks/BrowserBookmarks.js';
import { FrameTask } from '../../core/FrameTask.js';
import type { FrameTiming } from '../../core/FrameTask.js';
import type { Logger } from '../../core/Logger.js';
import { FolderTree } from './FolderTree.js';
import type { TreeEntry } from './FolderTree.js';

export type SourceBookmarks = Pick<BrowserBookmarks, 'getTree' | 'onChange'>;

export interface TreeSourceSettings {
  /** Titles of the root folder. */
  path: string[];
  /** How many levels of folders are shown. */
  maxDepth: number;
  /** Other roots whose links must be known too, so that their tabs are not taken for orphans. */
  otherPaths?: string[][];
  /** Called after every rebuild. */
  onChange: () => void;
  logger: Logger;
  /** Frame scheduling, replaceable in tests. */
  timing?: FrameTiming;
}

export class FolderTreeSource {
  #bookmarks: SourceBookmarks;
  #path: string[];
  #maxDepth: number;
  #onChange: () => void;
  #logger: Logger;
  #task: FrameTask;
  #entries: TreeEntry[] = [];
  #generation = 0;
  #found = false;
  #otherPaths: string[][];
  #linkIds: ReadonlySet<string> | null = null;
  #started = false;
  #warned = new Set<string>();
  #unsubscribe: (() => void) | null = null;

  /**
   * Keeps the tree of the root folder up to date: it is read at the start and again, once per
   * frame, after any change among the bookmarks.
   *
   * @param bookmarks Bookmarks API.
   * @param settings The root folder, the depth, and what to call and log.
   */
  constructor(bookmarks: SourceBookmarks, { path, maxDepth, otherPaths = [], onChange, logger, timing = {} }: TreeSourceSettings) {
    this.#bookmarks = bookmarks;
    this.#path = path;
    this.#maxDepth = maxDepth;
    this.#otherPaths = otherPaths;
    this.#onChange = onChange;
    this.#logger = logger;
    this.#task = new FrameTask(() => void this.rebuild(), timing);
  }

  /**
   * @returns The folders and links to show; empty while the root is missing.
   */
  public get entries(): TreeEntry[] {
    return this.#entries;
  }

  /**
   * @returns Whether the root folder was found the last time the bookmarks were read.
   */
  public get found(): boolean {
    return this.#found;
  }

  /**
   * @returns The ids of the links under the current root and every other root, or null while any of
   *   those roots is missing or there is none; a tab linked to another id belongs to a removed bookmark.
   */
  public get linkIds(): ReadonlySet<string> | null {
    return this.#linkIds;
  }

  /**
   * Reads the tree and starts following the bookmarks. Throws when a bookmark event is missing.
   */
  public async start(): Promise<void> {
    this.#started = true;
    this.#unsubscribe = this.#bookmarks.onChange(() => this.#task.request());
    await this.rebuild();
  }

  /**
   * Stops following the bookmarks.
   */
  public stop(): void {
    this.#task.cancel();
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#generation += 1;
  }

  /**
   * Switches to another root folder and reads the tree. Before `start` it only remembers the path.
   *
   * @param path Titles of the new root folder; empty for no folders.
   */
  public async useRoot(path: string[]): Promise<void> {
    this.#path = path;
    if (this.#started) {
      await this.rebuild();
    }
  }

  /**
   * Reads the tree again.
   */
  public async rebuild(): Promise<void> {
    const generation = ++this.#generation;
    try {
      const tree = await this.#bookmarks.getTree();
      if (generation !== this.#generation) {
        return;
      }
      const root = BookmarkFolderFinder.find(tree, this.#path);
      if (root === null) {
        this.#warnMissing();
      }
      this.#found = root !== null;
      this.#entries = root === null ? [] : FolderTree.build(root.children ?? [], this.#maxDepth);
      this.#linkIds = this.#idsOfAllRoots(tree);
      this.#onChange();
    } catch (error) {
      this.#logger.warn('could not read the bookmarks', error);
    }
  }

  #idsOfAllRoots(tree: BookmarkNode[]): ReadonlySet<string> | null {
    const paths = [this.#path, ...this.#otherPaths].filter((path) => path.length > 0);
    const roots = paths.map((path) => BookmarkFolderFinder.find(tree, path));
    if (roots.length === 0 || roots.includes(null)) {
      return null;
    }
    const links = roots.flatMap((root) => FolderTree.links(FolderTree.build(root?.children ?? [], this.#maxDepth)));
    return new Set(links.map((entry) => entry.id));
  }

  #warnMissing(): void {
    const name = this.#path.join('/');
    if (this.#path.length > 0 && !this.#warned.has(name)) {
      this.#warned.add(name);
      this.#logger.warn(`no bookmark folder matches "${name}": the section stays empty`);
    }
  }
}
