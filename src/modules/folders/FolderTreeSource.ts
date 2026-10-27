import { BookmarkFolderFinder } from '../../core/bookmarks/BookmarkFolderFinder.js';
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
  #warnedMissing = false;
  #unsubscribe: (() => void) | null = null;

  /**
   * Keeps the tree of the root folder up to date: it is read at the start and again, once per
   * frame, after any change among the bookmarks.
   *
   * @param bookmarks Bookmarks API.
   * @param settings The root folder, the depth, and what to call and log.
   */
  constructor(bookmarks: SourceBookmarks, { path, maxDepth, onChange, logger, timing = {} }: TreeSourceSettings) {
    this.#bookmarks = bookmarks;
    this.#path = path;
    this.#maxDepth = maxDepth;
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
   * Reads the tree and starts following the bookmarks. Throws when a bookmark event is missing.
   */
  public async start(): Promise<void> {
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
   * Reads the tree again.
   */
  public async rebuild(): Promise<void> {
    const generation = ++this.#generation;
    try {
      const root = BookmarkFolderFinder.find(await this.#bookmarks.getTree(), this.#path);
      if (generation !== this.#generation) {
        return;
      }
      if (root === null) {
        this.#warnMissing();
      }
      this.#entries = root === null ? [] : FolderTree.build(root.children ?? [], this.#maxDepth);
      this.#onChange();
    } catch (error) {
      this.#logger.warn('could not read the bookmarks', error);
    }
  }

  #warnMissing(): void {
    if (!this.#warnedMissing) {
      this.#warnedMissing = true;
      this.#logger.warn(`no bookmark folder matches "${this.#path.join('/')}": the section stays empty`);
    }
  }
}
