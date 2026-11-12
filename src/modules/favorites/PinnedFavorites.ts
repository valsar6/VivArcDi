import type { BrowserTabs } from '../../core/BrowserTabs.js';
import type { HiddenTabs } from '../../shared/tabs/HiddenTabs.js';
import type { Logger } from '../../core/Logger.js';
import type { SelectorCatalog } from '../../core/SelectorCatalog.js';
import { SerialTask } from '../../core/SerialTask.js';
import { TabBarAnchor } from '../../core/TabBarAnchor.js';
import { TabData } from '../../core/TabData.js';
import { TabUnloader } from '../../core/TabUnloader.js';
import { GRID_ORDER } from './BookmarkFavorites.js';
import type { TileState } from './FavoriteStates.js';
import type { Favorite } from './FavoritesFolder.js';
import { FavoritesView } from './FavoritesView.js';
import { TabChanges } from './TabChanges.js';
import type { TileSource } from './TileSource.js';
import { UnloadedTabs } from '../../shared/tabs/UnloadedTabs.js';

export const TILE_SOURCE_ATTRIBUTE = 'data-vivarcdi-tile-source';
const HIDDEN_OWNER = 'pinned-favorites';
export const PINNED_GRID_ORDER = GRID_ORDER + 1;

export type PinnedFavoritesTabs = Pick<BrowserTabs, 'query' | 'activate' | 'reload' | 'discard' | 'get' | 'onUpdated' | 'onActivated' | 'onRemoved' | 'onCreated'>;

export interface PinnedFavoritesDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** Needs `tabListHost`. */
  selectors: SelectorCatalog;
  /** Tabs API. */
  tabs: PinnedFavoritesTabs;
  /** Reports failures. */
  logger: Logger;
  /** Most tiles shown. */
  maxTiles: number;
  /** Receives the ids of the tabs that tiles stand for, to hide them from the list. */
  hiddenTabs: HiddenTabs;
  /** Called when the tab bar needs marking again. */
  onChange: () => void;
}

export class PinnedFavorites implements TileSource {
  #deps: PinnedFavoritesDependencies;
  #view: FavoritesView;
  #anchor: TabBarAnchor;
  #changes: TabChanges;
  #task: SerialTask;
  #tabIds: number[] = [];
  #detach: (() => void) | null = null;

  /**
   * The pinned tabs of the active workspace that no Favorite of the bookmark folder stands for,
   * drawn as tiles under the Favorites, or as the only tiles when the folder is missing or has no
   * links. Each pinned tab becomes a tile and its slot in Vivaldi's tab list is hidden, so
   * Vivaldi's own group of pinned tabs never shows; a click on a tile activates that tab.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: PinnedFavoritesDependencies) {
    const { document, selectors, tabs, logger } = dependencies;
    this.#deps = dependencies;
    this.#view = new FavoritesView(document, {
      open: (favorite): void => void this.#open(Number(favorite.id)),
      unload: (favorite): void => void this.#unload(Number(favorite.id)),
    });
    this.#view.element.setAttribute(TILE_SOURCE_ATTRIBUTE, 'pinned');
    this.#anchor = TabBarAnchor.of(document, selectors.get('tabListHost'));
    this.#changes = new TabChanges(tabs, logger, () => this.#task.request());
    this.#task = new SerialTask(
      () => this.#read(),
      (error) => logger.error('Could not read the pinned tabs', error),
    );
  }

  /**
   * Picks the tabs that become tiles: the pinned tabs of the workspace of the active tab that are
   * not linked to a Favorite of the bookmark folder, by position.
   *
   * @param windowTabs Every tab of the window.
   * @param maxTiles Most tiles shown.
   * @returns The tabs of the tiles, in order.
   */
  public static tilesOf(windowTabs: chrome.tabs.Tab[], maxTiles: number): chrome.tabs.Tab[] {
    const active = windowTabs.find((tab) => tab.active);
    const workspace = active === undefined ? null : TabData.of(active);
    return windowTabs
      .filter((tab) => tab.id !== undefined && tab.pinned === true && TabData.of(tab) === workspace)
      .filter((tab) => TabData.ownOf(tab).favoriteId === undefined)
      .sort((a, b) => a.index - b.index)
      .slice(0, maxTiles);
  }

  /**
   * @returns How many tiles are shown.
   */
  public get count(): number {
    return this.#view.count;
  }

  /**
   * @returns The element of the grid, whether or not it is in the window.
   */
  public get element(): HTMLElement {
    return this.#view.element;
  }

  /**
   * Reads the pinned tabs and starts following the tabs.
   */
  public async start(): Promise<void> {
    this.#changes.start();
    this.#task.request();
    await this.#task.idle();
  }

  /**
   * Removes the tiles and every listener, and shows the pinned tabs in the list again.
   */
  public stop(): void {
    this.#changes.stop();
    this.place(false);
    this.#view.destroy();
    this.#deps.hiddenTabs.clear(HIDDEN_OWNER);
  }

  /**
   * Shows or hides the tiles above the tab list, and hides or shows their tabs in the list.
   *
   * @param visible Whether the vertical tab bar is shown and there are tiles.
   * @returns The grid element when it is in place, otherwise null.
   */
  public place(visible: boolean): HTMLElement | null {
    if (!visible) {
      this.#detach?.();
      this.#detach = null;
      this.#deps.hiddenTabs.clear(HIDDEN_OWNER);
      return null;
    }
    try {
      this.#detach ??= this.#anchor.add(this.#view.element, PINNED_GRID_ORDER);
    } catch {
      return null;
    }
    this.#deps.hiddenTabs.set(HIDDEN_OWNER, this.#tabIds);
    return this.#view.element;
  }

  async #read(): Promise<void> {
    const windowTabs = await this.#deps.tabs.query({ currentWindow: true });
    const tiles = PinnedFavorites.tilesOf(windowTabs, this.#deps.maxTiles);
    this.#tabIds = tiles.map((tab) => tab.id as number);
    this.#view.show(tiles.map((tab) => PinnedFavorites.#favoriteOf(tab)));
    this.#view.apply(new Map(tiles.map((tab) => [String(tab.id), PinnedFavorites.#stateOf(tab)])));
    this.#deps.onChange();
  }

  static #favoriteOf(tab: chrome.tabs.Tab): Favorite {
    const url = tab.url ?? tab.pendingUrl ?? '';
    return { id: String(tab.id), title: tab.title ?? url, url };
  }

  static #stateOf(tab: chrome.tabs.Tab): TileState {
    return { active: tab.active, unloaded: UnloadedTabs.isUnloaded(tab), away: false };
  }

  async #open(tabId: number): Promise<void> {
    try {
      const tab = await this.#deps.tabs.get(tabId);
      await this.#deps.tabs.activate(tabId);
      if (UnloadedTabs.isUnloaded(tab)) {
        await this.#deps.tabs.reload(tabId);
      }
    } catch (error) {
      this.#deps.logger.error('Could not open the pinned tab', error);
    }
  }

  async #unload(tabId: number): Promise<void> {
    try {
      await new TabUnloader(this.#deps.tabs).unload(tabId);
    } catch (error) {
      this.#deps.logger.error('Could not unload the pinned tab', error);
    }
  }
}
