import { Module } from '../../core/boot/Module.js';
import type { ModuleContext } from '../../core/boot/Module.js';
import { registerReactProbe } from '../../shared/spaces/ReactProbe.js';
import { BOOKMARK_FOLDERS_OPTIONS } from './BookmarkFoldersOptions.js';
import type { BookmarkFoldersOptions } from './BookmarkFoldersOptions.js';
import { FolderSection } from './FolderSection.js';
import { WorkspaceRoots } from './tree/WorkspaceRoots.js';

export class BookmarkFolders extends Module<BookmarkFoldersOptions> {
  public static override id = 'bookmark-folders';
  public static override options = BOOKMARK_FOLDERS_OPTIONS;

  #section: FolderSection | null = null;

  /**
   * Shows a bookmark folder in the vertical tab bar, below the Favorites grid: folders open and
   * close, a click opens a link or brings its tab forward, and the tab of a link lives in its row
   * instead of Vivaldi's tab list. Each workspace shows its own root folder (option `workspaces`,
   * else `root`, else `<workspacesBase>/<workspace name>`); a root that does not exist yet shows
   * nothing and is created by the first write. Without `chrome.bookmarks`,
   * `chrome.tabs` or the tab bar it stays off.
   *
   * @param context What the module may use.
   */
  public override async start(context: ModuleContext<BookmarkFoldersOptions>): Promise<void> {
    const { tabs, bookmarks, logger, options } = context;
    if (!bookmarks.available || !tabs.available) {
      logger.warn('chrome.bookmarks or chrome.tabs is missing: the bookmark folders are off');
      return;
    }
    registerReactProbe(context);
    this.#section = new FolderSection(context, {
      roots: new WorkspaceRoots(options),
      maxDepth: options.maxDepth,
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
}
