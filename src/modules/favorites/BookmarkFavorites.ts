import type { BrowserBookmarks } from '../../core/bookmarks/BrowserBookmarks.js';
import type { BrowserTabs } from '../../core/BrowserTabs.js';
import type { Logger } from '../../core/Logger.js';
import type { SelectorCatalog } from '../../core/SelectorCatalog.js';
import { TabBarAnchor } from '../../core/TabBarAnchor.js';
import { TabUnloader } from '../../core/TabUnloader.js';
import { FavoriteOpener } from './FavoriteOpener.js';
import { FavoriteStates } from './FavoriteStates.js';
import { FavoritesFolder } from './FavoritesFolder.js';
import type { Favorite } from './FavoritesFolder.js';
import { FavoritesView } from './FavoritesView.js';
import { LinkedTabs } from './LinkedTabs.js';

const GRID_ORDER = 10;

export interface BookmarkFavoritesDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** Needs `tabListHost`. */
  selectors: SelectorCatalog;
  /** Tabs API. */
  tabs: BrowserTabs;
  /** Read-only bookmarks API. */
  bookmarks: BrowserBookmarks;
  /** Reports failures. */
  logger: Logger;
  /** Path of the Favorites folder. */
  folder: string;
  /** Most tiles shown. */
  maxTiles: number;
  /** Filled with the ids of the tabs that tiles stand for, to hide them from the list. */
  hiddenTabs: Set<number>;
  /** Called when the tab bar needs marking again. */
  onChange: () => void;
}

export class BookmarkFavorites {
  #deps: BookmarkFavoritesDependencies;
  #links: LinkedTabs;
  #view: FavoritesView;
  #anchor: TabBarAnchor;
  #detach: (() => void) | null = null;
  #folder: FavoritesFolder;
  #favorites: Favorite[] | null = null;
  #unsubscribe: Array<() => void> = [];
  #reading: Promise<void> | null = null;
  #readAgain = false;

  /**
   * The Favorites drawn from a bookmark folder: the same tiles in every workspace, each one
   * opening a pinned tab of the current workspace that the tab list hides.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: BookmarkFavoritesDependencies) {
    const { document, selectors, tabs, bookmarks, logger, folder } = dependencies;
    this.#deps = dependencies;
    this.#links = new LinkedTabs(tabs);
    const opener = new FavoriteOpener(tabs, this.#links, new TabUnloader(tabs), logger);
    this.#view = new FavoritesView(document, {
      open: (favorite): void => void opener.open(favorite),
      unload: (favorite): void => void opener.unload(favorite),
    });
    this.#anchor = TabBarAnchor.of(document, selectors.get('tabListHost'));
    this.#folder = new FavoritesFolder(bookmarks, folder, (favorites) => this.#receive(favorites));
  }

  /**
   * @returns Whether the folder was found, so the tiles come from it.
   */
  public get active(): boolean {
    return this.#favorites !== null;
  }

  /**
   * @returns How many tiles are shown.
   */
  public get count(): number {
    return this.#view.count;
  }

  /**
   * Reads the folder and starts following bookmarks and tabs.
   */
  public async start(): Promise<void> {
    this.#subscribeToTabs();
    await this.#folder.start();
  }

  /**
   * Removes the tiles and every listener.
   */
  public stop(): void {
    this.#folder.stop();
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
    this.place(false);
    this.#view.destroy();
    this.#deps.hiddenTabs.clear();
  }

  /**
   * Shows or hides the tiles above the tab list; the shared anchor keeps them there
   * through Vivaldi's redraws.
   *
   * @param visible Whether the vertical tab bar is shown.
   * @returns The grid element when it is in place, otherwise null.
   */
  public place(visible: boolean): HTMLElement | null {
    if (!visible || !this.active) {
      this.#detach?.();
      this.#detach = null;
      return null;
    }
    try {
      this.#detach ??= this.#anchor.add(this.#view.element, GRID_ORDER);
    } catch {
      return null;
    }
    return this.#view.element;
  }

  #subscribeToTabs(): void {
    const { tabs, logger } = this.#deps;
    const read = (): void => this.#readStates();
    const events: Array<() => () => void> = [
      (): (() => void) => tabs.onUpdated(read),
      (): (() => void) => tabs.onActivated(read),
      (): (() => void) => tabs.onRemoved(read),
      (): (() => void) => tabs.onCreated(read),
    ];
    for (const subscribe of events) {
      try {
        this.#unsubscribe.push(subscribe());
      } catch {
        logger.warn('A tab event is missing: tiles may lag behind the tabs');
      }
    }
  }

  #receive(favorites: Favorite[] | null): void {
    const { logger, folder, maxTiles } = this.#deps;
    if (favorites === null) {
      logger.warn(`Bookmark folder "${folder}" not found: the Favorites are the first pinned tabs`);
    } else {
      this.#view.show(favorites.slice(0, maxTiles));
      this.#links.sync(favorites).catch((error: unknown) => logger.error('Could not update linked tabs', error));
    }
    this.#favorites = favorites === null ? null : favorites.slice(0, maxTiles);
    this.#readStates();
    this.#deps.onChange();
  }

  #readStates(): void {
    if (this.#reading !== null) {
      this.#readAgain = true;
      return;
    }
    this.#reading = this.#applyStates()
      .catch((error: unknown) => this.#deps.logger.error('Could not read the Favorites tabs', error))
      .finally(() => {
        this.#reading = null;
        if (this.#readAgain) {
          this.#readAgain = false;
          this.#readStates();
        }
      });
  }

  async #applyStates(): Promise<void> {
    if (this.#favorites === null) {
      return;
    }
    const snapshot = await this.#links.snapshot();
    this.#view.apply(FavoriteStates.of(this.#favorites, snapshot));
    const { hiddenTabs } = this.#deps;
    hiddenTabs.clear();
    snapshot.linkedTabIds.forEach((id) => hiddenTabs.add(id));
    this.#deps.onChange();
  }
}
