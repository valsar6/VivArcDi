import { AddressKey } from "../../../core/tabs/AddressKey.js";
import { PIN_TAB_LABEL, TILE_TAB_LABEL } from "../../../shared/tabs/CommandLabels.js";
import { KeptTab } from "../../../shared/tabs/KeptTab.js";
import { FAILED_TEXT } from "./FavoriteShortcut.js";
const PIN_TAB_ID = "vivarcdi-pin-tab";
const TILE_TAB_ID = "vivarcdi-tile-tab";
class TabCommands {
  #deps;
  /**
   * Pin tab and Tile tab for a tab of today: the first adds the tab as a link at the end of the
   * workspace favorites, as Cmd/Ctrl+D does, the second as a tile at the end of the Favorites
   * grid, as a drop on the grid does. They are meant for `TabMenuItems`.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * @param tab A tab.
   * @returns Whether the commands apply: a web page that is not pinned, a Favorite or a link.
   */
  static appliesTo(tab) {
    return AddressKey.from(tab.url) !== null && !KeptTab.is(tab);
  }
  /**
   * @returns The commands, in the order of the menu.
   */
  get commands() {
    return [
      { id: PIN_TAB_ID, label: PIN_TAB_LABEL, run: (tab) => this.#pin(tab) },
      { id: TILE_TAB_ID, label: TILE_TAB_LABEL, run: (tab) => this.#tile(tab) }
    ];
  }
  async #pin(tab) {
    if (await this.#deps.favorites.add(tab) === "failed") {
      this.#deps.notify(FAILED_TEXT);
    }
  }
  async #tile(tab) {
    const end = this.#deps.grid.end();
    if (end === null || !await this.#deps.grid.drop(end, { tab })) {
      this.#deps.notify(FAILED_TEXT);
    }
  }
}
export {
  PIN_TAB_ID,
  TILE_TAB_ID,
  TabCommands
};
