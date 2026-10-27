import { Module } from '../../core/Module.js';
import type { ModuleContext } from '../../core/Module.js';
import { PinnedClosing } from './PinnedClosing.js';
import { PinnedMarking } from './PinnedMarking.js';
import { PinWatcher } from './PinWatcher.js';
import { ResetClick } from './ResetClick.js';
import { SavedAddresses } from './SavedAddresses.js';

export interface PinnedTabsSettings {
  /** Whether the favicon of an away pinned row brings it back to its own page. */
  resetButton: boolean;
  /** Whether Cmd/Ctrl+W and the close button unload Favorites and pinned tabs. */
  unloadOnClose: boolean;
}

export class PinnedTabs extends Module {
  public static override id = 'pinned-tabs';

  /**
   * Options accepted in `config.json`, with their defaults.
   */
  public static readonly defaults: Readonly<PinnedTabsSettings> = Object.freeze({
    resetButton: true,
    unloadOnClose: true,
  });

  #watcher: PinWatcher | null = null;
  #marking: PinnedMarking | null = null;
  #reset: ResetClick | null = null;
  #closing: PinnedClosing | null = null;

  /**
   * Makes pinned tabs work as in Arc: each one remembers its own page, shows a reset arrow when
   * it leaves it, and is unloaded instead of closed. A separator follows the last pinned row.
   *
   * @param context What the module may use.
   */
  public override async start(context: ModuleContext): Promise<void> {
    const { tabs, logger, options } = context;
    if (!tabs.available) {
      logger.warn('chrome.tabs is missing: pinned tabs are left to Vivaldi');
      return;
    }
    const settings: PinnedTabsSettings = { ...PinnedTabs.defaults, ...options };
    const addresses = new SavedAddresses(tabs);
    this.#watcher = new PinWatcher(tabs, addresses, logger);
    this.#marking = new PinnedMarking(context);
    await this.#watcher.start();
    await this.#marking.start();
    if (settings.resetButton) {
      this.#startReset(context, addresses);
    }
    if (settings.unloadOnClose) {
      this.#closing = new PinnedClosing(context);
      await this.#closing.start();
    }
  }

  /**
   * Removes every mark and listener, leaving Vivaldi's tab bar as it was.
   */
  public override stop(): void {
    this.#closing?.stop();
    this.#reset?.detach();
    this.#marking?.stop();
    this.#watcher?.stop();
    this.#closing = null;
    this.#reset = null;
    this.#marking = null;
    this.#watcher = null;
  }

  #startReset({ document, selectors, logger }: ModuleContext, addresses: SavedAddresses): void {
    const marking = this.#marking;
    this.#reset = new ResetClick({
      document,
      faviconSelector: selectors.get('tabFavicon'),
      wrapperSelector: selectors.get('tabWrapper'),
      isAway: (tabId): boolean => marking?.isAway(tabId) === true,
      reset: (tabId): void => void addresses.load(tabId).catch((error: unknown) => logger.error(`Could not reset tab ${tabId}`, error)),
    });
    this.#reset.attach();
  }
}
