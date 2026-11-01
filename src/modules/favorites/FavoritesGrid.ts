import type { BrowserBookmarks } from '../../core/bookmarks/BrowserBookmarks.js';
import { DomQuery } from '../../core/DomQuery.js';
import { FrameTask } from '../../core/FrameTask.js';
import { HiddenTabMarker } from '../../core/HiddenTabMarker.js';
import { HiddenTabs } from '../../core/HiddenTabs.js';
import type { Logger } from '../../core/Logger.js';
import { Module } from '../../core/Module.js';
import type { ModuleContext } from '../../core/Module.js';
import type { SelectorCatalog } from '../../core/SelectorCatalog.js';
import type { BrowserTabs } from '../../core/BrowserTabs.js';
import { TabUnloader } from '../../core/TabUnloader.js';
import { TabBarAnchor } from '../../core/TabBarAnchor.js';
import { BookmarkFavorites } from './BookmarkFavorites.js';
import { EmptyGridDrop } from './EmptyGridDrop.js';
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
  /** Hint of the placeholder that takes a dropped tab while the grid has no tiles. */
  emptyHint: string;
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
    emptyHint: 'Drag a tab here to pin it',
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
  #hiddenTabs: HiddenTabs | null = null;
  #hiddenMarker: HiddenTabMarker | null = null;
  #emptyDrop: EmptyGridDrop | null = null;

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
      this.#startEmptyDrop(settings, tabs, logger);
    } else {
      logger.warn('chrome.tabs is missing: unloaded tiles are not dimmed and middle click closes tabs');
    }
    this.#tagger = new FavoriteTagger(selectors, settings.maxTiles, this.#unloadedTabs ?? NO_TABS);
    this.#hiddenTabs = HiddenTabs.of(document);
    this.#hiddenMarker = new HiddenTabMarker(document, selectors, this.#hiddenTabs);
    this.#hiddenMarker.start();

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
    this.#emptyDrop?.stop();
    this.#emptyDrop = null;
    this.#unloadedTabs?.stop();
    this.#stopBookmarks();
    this.#layout?.release();
    this.#tagger?.clear();
    this.#observer = null;
    this.#middleClick = null;
    this.#unloadedTabs = null;
  }

  #stopBookmarks(): void {
    this.#fromBookmarks?.stop();
    this.#hiddenMarker?.stop();
    this.#fromBookmarks = null;
    this.#hiddenMarker = null;
    this.#hiddenTabs = null;
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

  #startEmptyDrop(settings: FavoritesGridSettings, tabs: BrowserTabs, logger: Logger): void {
    if (this.#document === null || this.#selectors?.has('tabListHost') !== true) {
      return;
    }
    this.#emptyDrop = new EmptyGridDrop({
      document: this.#document,
      wrapperSelector: this.#selectors.get('tabWrapper'),
      anchor: TabBarAnchor.of(this.#document, this.#selectors.get('tabListHost')),
      tabs,
      hint: settings.emptyHint,
      logger,
    });
    this.#emptyDrop.start();
  }

  async #startBookmarks(tabs: BrowserTabs, bookmarks: BrowserBookmarks | undefined, logger: Logger): Promise<void> {
    const document = this.#document;
    const selectors = this.#selectors;
    const hiddenTabs = this.#hiddenTabs;
    if (!tabs.available || bookmarks?.available !== true || document === null || hiddenTabs === null || selectors?.has('tabListHost') !== true) {
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
      hiddenTabs,
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
    const tiles = this.#layTiles(fromBookmarks, strip, tagger.tileCount);
    this.#emptyDrop?.show(strip !== null && tiles === 0);
  }

  #layTiles(fromBookmarks: BookmarkFavorites | null, strip: HTMLElement | null, pinnedTiles: number): number {
    if (fromBookmarks === null) {
      this.#showPinnedTiles(strip, pinnedTiles);
      return pinnedTiles;
    }
    this.#layout?.follow(fromBookmarks.place(strip !== null), fromBookmarks.count);
    return fromBookmarks.count;
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
