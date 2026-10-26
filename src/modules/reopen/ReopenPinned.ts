import { Module } from '../../core/Module.js';
import type { ModuleContext } from '../../core/Module.js';
import { ActivationRecorder } from './ActivationRecorder.js';
import { LastOpenedStore } from './LastOpenedStore.js';
import type { KeyValueStorage } from './LastOpenedStore.js';
import { NewTabWatcher } from './NewTabWatcher.js';
import type { NewTabNavigation } from './NewTabWatcher.js';
import { PinnedTabFinder } from './PinnedTabFinder.js';
import { TabSwitcher } from './TabSwitcher.js';

export class ReopenPinned extends Module {
  public static override id = 'reopen-pinned';

  #watcher: NewTabWatcher | null = null;
  #recorder: ActivationRecorder | null = null;

  /**
   * Opening from a new tab the address of a Favorite or pinned tab of the current workspace
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
    const store = new LastOpenedStore(ReopenPinned.#storageOf(context.document), logger);
    store.load(new Date());
    const finder = new PinnedTabFinder(tabs);
    const switcher = new TabSwitcher(tabs, logger);
    const watcher = new NewTabWatcher(tabs, (navigation) => void this.#reopen(navigation, finder, switcher, context));
    const recorder = new ActivationRecorder(tabs, store, logger);
    try {
      watcher.start();
      recorder.start();
    } catch (error) {
      watcher.stop();
      recorder.stop();
      logger.warn('tab events are missing: reopening pinned tabs is off', error);
      return;
    }
    this.#watcher = watcher;
    this.#recorder = recorder;
  }

  /**
   * Removes every listener. Saved dates stay.
   */
  public override stop(): void {
    this.#watcher?.stop();
    this.#recorder?.stop();
    this.#watcher = null;
    this.#recorder = null;
  }

  static #storageOf(document: Document): KeyValueStorage | null {
    try {
      return document.defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  }

  async #reopen({ tab, url }: NewTabNavigation, finder: PinnedTabFinder, switcher: TabSwitcher, { logger }: ModuleContext): Promise<void> {
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
