import { AddressKey } from '../../../core/tabs/AddressKey.js';
import { PIN_TAB_LABEL, TILE_TAB_LABEL } from '../../../shared/tabs/CommandLabels.js';
import type { FavoriteDropZone } from '../../../shared/dragdrop/FavoriteDropZone.js';
import { KeptTab } from '../../../shared/tabs/KeptTab.js';
import type { TabMenuCommand } from './TabMenuItems.js';
import { FAILED_TEXT } from './FavoriteShortcut.js';
import type { WorkspaceFavorites } from './WorkspaceFavorites.js';

export interface TabCommandsDependencies {
  favorites: Pick<WorkspaceFavorites, 'add'>;
  /** The Favorites grid, offered by the Favorites. */
  grid: Pick<FavoriteDropZone, 'end' | 'drop'>;
  /** Shows a short message to the user. */
  notify: (text: string) => void;
}

export const PIN_TAB_ID = 'vivarcdi-pin-tab';
export const TILE_TAB_ID = 'vivarcdi-tile-tab';

export class TabCommands {
  #deps: TabCommandsDependencies;

  /**
   * Pin tab and Tile tab for a tab of today: the first adds the tab as a link at the end of the
   * workspace favorites, as Cmd/Ctrl+D does, the second as a tile at the end of the Favorites
   * grid, as a drop on the grid does. They are meant for `TabMenuItems`.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: TabCommandsDependencies) {
    this.#deps = dependencies;
  }

  /**
   * @param tab A tab.
   * @returns Whether the commands apply: a web page that is not pinned, a Favorite or a link.
   */
  public static appliesTo(tab: chrome.tabs.Tab): boolean {
    return AddressKey.from(tab.url) !== null && !KeptTab.is(tab);
  }

  /**
   * @returns The commands, in the order of the menu.
   */
  public get commands(): TabMenuCommand[] {
    return [
      { id: PIN_TAB_ID, label: PIN_TAB_LABEL, run: (tab): Promise<void> => this.#pin(tab) },
      { id: TILE_TAB_ID, label: TILE_TAB_LABEL, run: (tab): Promise<void> => this.#tile(tab) },
    ];
  }

  async #pin(tab: chrome.tabs.Tab): Promise<void> {
    if ((await this.#deps.favorites.add(tab)) === 'failed') {
      this.#deps.notify(FAILED_TEXT);
    }
  }

  async #tile(tab: chrome.tabs.Tab): Promise<void> {
    const end = this.#deps.grid.end();
    if (end === null || !(await this.#deps.grid.drop(end, { tab }))) {
      this.#deps.notify(FAILED_TEXT);
    }
  }
}
