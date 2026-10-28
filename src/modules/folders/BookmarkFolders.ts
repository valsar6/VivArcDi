import { BookmarkFolderFinder } from '../../core/bookmarks/BookmarkFolderFinder.js';
import { Module } from '../../core/Module.js';
import type { ModuleContext } from '../../core/Module.js';
import { FolderSection } from './FolderSection.js';

const DEFAULT_ROOT = 'VivArcDi';
const DEFAULT_MAX_DEPTH = 3;
const DEFAULT_MAX_HEIGHT_PERCENT = 60;
const MAX_DEPTH_LIMIT = 10;
const MIN_PERCENT = 20;
const MAX_PERCENT = 100;

export class BookmarkFolders extends Module {
  public static override id = 'bookmark-folders';

  #section: FolderSection | null = null;

  /**
   * Shows a bookmark folder in the vertical tab bar, below the Favorites grid: folders open and
   * close, a click opens a link or brings its tab forward, and the tab of a link lives in its row
   * instead of Vivaldi's tab list. Bookmarks are only read. Without `chrome.bookmarks`,
   * `chrome.tabs` or the tab bar it stays off.
   *
   * @param context What the module may use.
   */
  public override async start(context: ModuleContext): Promise<void> {
    const { tabs, bookmarks, logger, options } = context;
    if (!bookmarks.available || !tabs.available) {
      logger.warn('chrome.bookmarks or chrome.tabs is missing: the bookmark folders are off');
      return;
    }
    this.#section = new FolderSection(context, {
      root: BookmarkFolderFinder.parsePath(typeof options['root'] === 'string' ? options['root'] : DEFAULT_ROOT),
      maxDepth: BookmarkFolders.#number(options['maxDepth'], DEFAULT_MAX_DEPTH, 1, MAX_DEPTH_LIMIT),
      maxHeightPercent: BookmarkFolders.#number(options['maxHeightPercent'], DEFAULT_MAX_HEIGHT_PERCENT, MIN_PERCENT, MAX_PERCENT),
    });
    try {
      await this.#section.start();
    } catch (error) {
      this.stop();
      logger.warn('the bookmark folders are off', error);
    }
  }

  /**
   * Removes the section and every listener. Bookmarks and saved folder states stay.
   */
  public override stop(): void {
    this.#section?.stop();
    this.#section = null;
  }

  static #number(value: unknown, fallback: number, min: number, max: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  }
}
