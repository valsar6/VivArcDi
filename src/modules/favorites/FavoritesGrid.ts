import type { BrowserBookmarks } from '../../core/bookmarks/BrowserBookmarks.js';
import { DomQuery } from '../../core/DomQuery.js';
import { FrameTask } from '../../core/FrameTask.js';
import type { Logger } from '../../core/Logger.js';
import { Module } from '../../core/Module.js';
import type { ModuleContext } from '../../core/Module.js';
import type { SelectorCatalog } from '../../core/SelectorCatalog.js';
import type { BrowserTabs } from '../../core/BrowserTabs.js';
import { TabUnloader } from '../../core/TabUnloader.js';
import { BookmarkFavorites } from './BookmarkFavorites.js';
import { FavoriteTagger } from './FavoriteTagger.js';
import type { UnloadedLookup } from './FavoriteTagger.js';
import { GridLayout } from './GridLayout.js';
import type { GridSettings } from './GridLayout.js';
import { MiddleClickUnload } from './MiddleClickUnload.js';
import { UnloadedTabs } from './UnloadedTabs.js';

const NO_TABS: UnloadedLookup = { has: () => false };

export interface FavoritesGridSettings extends GridSettings {
  /** Bookmark folder that holds the Favorites, as a path of titles separated by `/`. */
  folder: string;
  /** How many Favorites become tiles. */
  maxTiles: number;
  /** Whether a middle click unloads a tile instead of closing it. */
  unloadOnMiddleClick: boolean;
}

export class FavoritesGrid extends Module {
  public static override id = 'favorites-grid';

  /**
   * Options accepted in `config.json`, with their defaults.
   */
  public static readonly defaults: Readonly<FavoritesGridSettings> = Object.freeze({
    folder: 'Favorites',
    maxTiles: 12,
    maxColumns: 3,
    tileMinWidth: 64,
    tileHeight: 44,
    gap: 8,
    unloadOnMiddleClick: true,
  });

  #document: Document | null = null;
  #selectors: SelectorCatalog | null = null;
  #settings: FavoritesGridSettings = FavoritesGrid.defaults;
  #observer: MutationObserver | null = null;
  #refresh: FrameTask | null = null;
  #tagger: FavoriteTagger | null = null;
  #layout: GridLayout | null = null;
  #unloadedTabs: UnloadedTabs | null = null;
  #middleClick: MiddleClickUnload | null = null;
  #fromBookmarks: BookmarkFavorites | null = null;
  #hiddenTabs = new Set<number>();

  /**
   * Shows the Favorites as an Arc-style grid of icon tiles at the top of a vertical tab bar.
   * With `chrome.bookmarks` and `chrome.tabs`, the Favorites are the links of a bookmark folder,
   * the same in every workspace, and each opens a pinned tab hidden from the list. Without them,
   * or while the folder is missing, the first pinned tabs become the tiles. Tiles of unloaded
   * tabs are dimmed, and a middle click unloads a tile instead of closing it.
   *
   * @param context What the module may use.
   */
  public override async start({ document, selectors, logger, options, tabs, bookmarks }: ModuleContext): Promise<void> {
    const settings: FavoritesGridSettings = { ...FavoritesGrid.defaults, ...options };
    this.#settings = settings;
    this.#document = document;
    this.#selectors = selectors;
    this.#refresh = new FrameTask(() => this.#update());
    this.#layout = new GridLayout(settings);

    if (tabs.available) {
      this.#unloadedTabs = new UnloadedTabs(tabs, () => this.#refresh?.request());
      this.#startMiddleClick(settings, tabs, logger);
    } else {
      logger.warn('chrome.tabs is missing: unloaded tiles are not dimmed and middle click closes tabs');
    }
    this.#tagger = new FavoriteTagger(selectors, settings.maxTiles, this.#unloadedTabs ?? NO_TABS, this.#hiddenTabs);

    this.#observer = new MutationObserver(() => this.#refresh?.request());
    this.#observer.observe(DomQuery.require(document, selectors.get('browser')), {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    this.#update();
    await this.#unloadedTabs?.start().catch((error: unknown) => logger.error('Could not read unloaded tabs', error));
    await this.#startBookmarks(tabs, bookmarks, logger);
  }

  /**
   * Removes the grid and every listener, leaving Vivaldi's tab bar as it was.
   */
  public override stop(): void {
    this.#observer?.disconnect();
    this.#refresh?.cancel();
    this.#middleClick?.detach();
    this.#unloadedTabs?.stop();
    this.#fromBookmarks?.stop();
    this.#layout?.release();
    this.#tagger?.clear();
    this.#observer = null;
    this.#middleClick = null;
    this.#unloadedTabs = null;
    this.#fromBookmarks = null;
  }

  #startMiddleClick(settings: FavoritesGridSettings, tabs: BrowserTabs, logger: Logger): void {
    if (!settings.unloadOnMiddleClick || this.#document === null || this.#selectors === null) {
      return;
    }
    this.#middleClick = new MiddleClickUnload({
      document: this.#document,
      unloader: new TabUnloader(tabs),
      wrapperSelector: this.#selectors.get('tabWrapper'),
      logger,
    });
    this.#middleClick.attach();
  }

  async #startBookmarks(tabs: BrowserTabs, bookmarks: BrowserBookmarks | undefined, logger: Logger): Promise<void> {
    const document = this.#document;
    const selectors = this.#selectors;
    if (!tabs.available || bookmarks?.available !== true || document === null || selectors?.has('tabListHost') !== true) {
      logger.warn('Bookmarks, tabs or the tab list are missing: the Favorites are the first pinned tabs');
      return;
    }
    this.#fromBookmarks = new BookmarkFavorites({
      document,
      selectors,
      tabs,
      bookmarks,
      logger,
      folder: this.#settings.folder,
      maxTiles: this.#settings.maxTiles,
      hiddenTabs: this.#hiddenTabs,
      onChange: (): void => this.#refresh?.request(),
    });
    await this.#fromBookmarks.start().catch((error: unknown) => logger.error('Could not read the Favorites folder', error));
  }

  #update(): void {
    const tagger = this.#tagger;
    const tabBar = this.#tabBar();
    if (tagger === null || tabBar === undefined) {
      return;
    }
    const fromBookmarks = this.#fromBookmarks?.active === true ? this.#fromBookmarks : null;
    tagger.maxTiles = fromBookmarks === null ? this.#settings.maxTiles : 0;
    const strip = tagger.apply(tabBar);
    if (fromBookmarks === null) {
      this.#showPinnedTiles(strip, tagger.tileCount);
    } else {
      this.#layout?.follow(fromBookmarks.place(strip !== null), fromBookmarks.count);
    }
  }

  #tabBar(): Element | null | undefined {
    if (this.#document === null || this.#selectors === null) {
      return undefined;
    }
    return this.#document.querySelector(this.#selectors.get('tabBar'));
  }

  #showPinnedTiles(strip: HTMLElement | null, count: number): void {
    this.#fromBookmarks?.place(false);
    this.#layout?.follow(strip, count);
  }
}
