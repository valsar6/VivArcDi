import type { BrowserBookmarks } from '../../core/browser/bookmarks/BrowserBookmarks.js';
import type { BrowserTabs } from '../../core/browser/BrowserTabs.js';
import type { HiddenTabs } from '../../shared/tabs/HiddenTabs.js';
import type { Logger } from '../../core/support/Logger.js';
import type { SelectorCatalog } from '../../core/dom/SelectorCatalog.js';
import { TabBarAnchor } from '../../core/dom/TabBarAnchor.js';
import { SerialTask } from '../../core/support/SerialTask.js';
import { TabUnloader } from '../../core/tabs/TabUnloader.js';
import { FavoriteOpener } from './FavoriteOpener.js';
import { FavoriteStates } from './FavoriteStates.js';
import { FavoritesFolder } from './FavoritesFolder.js';
import type { Favorite } from './FavoritesFolder.js';
import { FavoritesView } from './FavoritesView.js';
import { LinkedTabs } from './LinkedTabs.js';
import { TabChanges } from './TabChanges.js';
import type { TileSource } from './TileSource.js';

export const GRID_ORDER = 10;
const HIDDEN_OWNER = 'favorites-grid';

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
  /** Receives the ids of the tabs that tiles stand for, to hide them from the list. */
  hiddenTabs: HiddenTabs;
  /** Called when the tab bar needs marking again. */
  onChange: () => void;
}

export class BookmarkFavorites implements TileSource {
  #deps: BookmarkFavoritesDependencies;
  #links: LinkedTabs;
  #view: FavoritesView;
  #anchor: TabBarAnchor;
  #detach: (() => void) | null = null;
  #folder: FavoritesFolder;
  #favorites: Favorite[] | null = null;
  #changes: TabChanges;
  #states: SerialTask;

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
    this.#changes = new TabChanges(tabs, logger, () => this.#readStates());
    this.#states = new SerialTask(
      () => this.#applyStates(),
      (error) => logger.error('Could not read the Favorites tabs', error),
    );
  }

  /**
   * @returns Whether the folder was found, so the tiles come from it.
   */
  public get active(): boolean {
    return this.#favorites !== null;
  }

  /**
   * @returns How many tiles are shown; 0 while the folder is missing.
   */
  public get count(): number {
    return this.active ? this.#view.count : 0;
  }

  /**
   * @returns The element of the grid, whether or not it is in the window.
   */
  public get element(): HTMLElement {
    return this.#view.element;
  }

  /**
   * Reads the folder and starts following bookmarks and tabs.
   */
  public async start(): Promise<void> {
    this.#changes.start();
    await this.#folder.start();
  }

  /**
   * Removes the tiles and every listener.
   */
  public stop(): void {
    this.#folder.stop();
    this.#changes.stop();
    this.place(false);
    this.#view.destroy();
    this.#deps.hiddenTabs.clear(HIDDEN_OWNER);
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
    this.#states.request();
  }

  async #applyStates(): Promise<void> {
    if (this.#favorites === null) {
      return;
    }
    const snapshot = await this.#links.snapshot();
    this.#view.apply(FavoriteStates.of(this.#favorites, snapshot));
    const { hiddenTabs } = this.#deps;
    hiddenTabs.set(HIDDEN_OWNER, snapshot.linkedTabIds);
    this.#deps.onChange();
  }
}
