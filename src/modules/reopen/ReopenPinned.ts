import { BookmarkFolderFinder } from '../../core/bookmarks/BookmarkFolderFinder.js';
import { LinkKeyIndex } from '../../core/bookmarks/LinkKeyIndex.js';
import { Module } from '../../core/Module.js';
import type { ModuleContext } from '../../core/Module.js';
import { ActivationRecorder } from './ActivationRecorder.js';
import { LastOpenedStore } from './LastOpenedStore.js';
import { NewTabWatcher } from './NewTabWatcher.js';
import type { NewTabNavigation } from './NewTabWatcher.js';
import { LinkedTabFinder } from './LinkedTabFinder.js';
import { PinnedTabFinder } from './PinnedTabFinder.js';
import { TabSwitcher } from './TabSwitcher.js';
import { TabTargets } from './TabTargets.js';

export class ReopenPinned extends Module {
  public static override id = 'reopen-pinned';

  #watcher: NewTabWatcher | null = null;
  #recorder: ActivationRecorder | null = null;
  #links: LinkKeyIndex | null = null;

  /**
   * Opening from a new tab the address of a Favorite, a pinned tab or a bookmark link of the current workspace
   * switches to that tab instead of keeping a duplicate, and the date each pinned tab is opened
   * is recorded. Without `chrome.tabs` or its events the module stays off.
   *
   * @param context What the module may use.
   */
  public override start(context: ModuleContext): void {
    const { tabs, logger } = context;
    if (!tabs.available) {
      logger.warn('chrome.tabs is missing: reopening pinned tabs is off');
      return;
    }
    const store = new LastOpenedStore(context.storage, logger);
    store.load(new Date());
    const links = ReopenPinned.#linksOf(context);
    const finder = new TabTargets([new PinnedTabFinder(tabs), ...(links === null ? [] : [new LinkedTabFinder(tabs, links)])]);
    const switcher = new TabSwitcher(tabs, logger);
    const watcher = new NewTabWatcher(tabs, (navigation) => void this.#reopen(navigation, finder, switcher, context));
    const recorder = new ActivationRecorder(tabs, store, logger, {
      isTracked: (tab, key): boolean => tab.pinned || links?.has(key) === true,
    });
    try {
      watcher.start();
      recorder.start();
    } catch (error) {
      watcher.stop();
      recorder.stop();
      links?.release();
      logger.warn('tab events are missing: reopening pinned tabs is off', error);
      return;
    }
    this.#watcher = watcher;
    this.#recorder = recorder;
    this.#links = links;
  }

  /**
   * Removes every listener. Saved dates stay.
   */
  public override stop(): void {
    this.#watcher?.stop();
    this.#recorder?.stop();
    this.#watcher = null;
    this.#recorder = null;
    this.#links?.release();
    this.#links = null;
  }

  /**
   * The links of the `bookmark-folders` root are reopened too, when that module is on.
   */
  static #linksOf({ bookmarks, modules, logger }: ModuleContext): LinkKeyIndex | null {
    const folders = modules['bookmark-folders'];
    if (folders === undefined || folders.enabled === false || !bookmarks.available) {
      return null;
    }
    const root = typeof folders['root'] === 'string' ? folders['root'] : '';
    return LinkKeyIndex.acquire(bookmarks, BookmarkFolderFinder.parsePath(root), logger);
  }


  async #reopen({ tab, url }: NewTabNavigation, finder: TabTargets, switcher: TabSwitcher, { logger }: ModuleContext): Promise<void> {
    try {
      const pinned = await finder.find(tab, url);
      if (pinned?.id !== undefined && tab.id !== undefined) {
        await switcher.switch(pinned.id, tab.id);
      }
    } catch (error) {
      logger.warn('could not look for a pinned tab; the new tab stays open', error);
    }
  }
}
