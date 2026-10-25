import { DomQuery } from '../../core/DomQuery.js';
import { FrameTask } from '../../core/FrameTask.js';
import type { Logger } from '../../core/Logger.js';
import { Module } from '../../core/Module.js';
import type { ModuleContext } from '../../core/Module.js';
import type { SelectorCatalog } from '../../core/SelectorCatalog.js';
import type { BrowserTabs } from '../../core/BrowserTabs.js';
import { FavoriteTagger } from './FavoriteTagger.js';
import type { UnloadedLookup } from './FavoriteTagger.js';
import { GridLayout } from './GridLayout.js';
import type { GridSettings } from './GridLayout.js';
import { MiddleClickUnload } from './MiddleClickUnload.js';
import { TileUnloader } from './TileUnloader.js';
import { UnloadedTabs } from './UnloadedTabs.js';

const NO_UNLOADED_TABS: UnloadedLookup = { has: () => false };

export interface FavoritesGridSettings extends GridSettings {
  /** How many pinned tabs become tiles. */
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
    maxTiles: 12,
    maxColumns: 3,
    tileMinWidth: 64,
    tileHeight: 44,
    gap: 6,
    unloadOnMiddleClick: true,
  });

  #document: Document | null = null;
  #selectors: SelectorCatalog | null = null;
  #observer: MutationObserver | null = null;
  #refresh: FrameTask | null = null;
  #tagger: FavoriteTagger | null = null;
  #layout: GridLayout | null = null;
  #unloadedTabs: UnloadedTabs | null = null;
  #middleClick: MiddleClickUnload | null = null;

  /**
   * Shows the first pinned tabs of a vertical tab bar as an Arc-style grid of icon tiles.
   * The grid follows Vivaldi's tab bar as it changes, dims tiles of unloaded tabs,
   * and, when `chrome.tabs` exists, unloads a tile on middle click instead of closing it.
   *
   * @param context What the module may use.
   */
  public override async start({ document, selectors, logger, options, tabs }: ModuleContext): Promise<void> {
    const settings = { ...FavoritesGrid.defaults, ...options };
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
    this.#tagger = new FavoriteTagger(selectors, settings.maxTiles, this.#unloadedTabs ?? NO_UNLOADED_TABS);

    this.#observer = new MutationObserver(() => this.#refresh?.request());
    this.#observer.observe(DomQuery.require(document, selectors.get('browser')), {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    this.#update();
    await this.#unloadedTabs?.start().catch((error: unknown) => logger.error('Could not read unloaded tabs', error));
  }

  /**
   * Removes the grid and every listener, leaving Vivaldi's tab bar as it was.
   */
  public override stop(): void {
    this.#observer?.disconnect();
    this.#refresh?.cancel();
    this.#middleClick?.detach();
    this.#unloadedTabs?.stop();
    this.#layout?.release();
    this.#tagger?.clear();
    this.#observer = null;
    this.#middleClick = null;
    this.#unloadedTabs = null;
  }

  #startMiddleClick(settings: FavoritesGridSettings, tabs: BrowserTabs, logger: Logger): void {
    if (!settings.unloadOnMiddleClick || this.#document === null || this.#selectors === null) {
      return;
    }
    this.#middleClick = new MiddleClickUnload({
      document: this.#document,
      unloader: new TileUnloader(tabs),
      wrapperSelector: this.#selectors.get('tabWrapper'),
      logger,
    });
    this.#middleClick.attach();
  }

  #update(): void {
    if (this.#document === null || this.#selectors === null) {
      return;
    }
    const tabBar = this.#document.querySelector(this.#selectors.get('tabBar'));
    const strip = this.#tagger?.apply(tabBar) ?? null;
    this.#layout?.follow(strip, this.#tagger?.tileCount ?? 0);
  }
}
