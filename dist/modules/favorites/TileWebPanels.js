import { PanelBar } from "./panels/PanelBar.js";
import { WebPanelForm } from "./panels/WebPanelForm.js";
import { WebPanelList } from "./panels/WebPanelList.js";
import { OPEN_WEB_PANEL_LABEL, SHOW_WEB_PANEL_LABEL } from "../../shared/tabs/CommandLabels.js";
class TileWebPanels {
  #deps;
  /**
   * The web panel command of a tile: Open as web panel for a page that is not a panel, Show web
   * panel for one that is. Neither touches the tile, and no other panel is changed.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * @param sources What the commands are built from.
   * @returns The commands, or null when the panel bar's selectors or the preferences are missing.
   */
  static of({ document, selectors, prefs, writer, logger }) {
    const bar = PanelBar.of(document, selectors);
    if (bar === null || !prefs.available) {
      logger.warn("The web panel selectors or the preferences are missing: the tile menu has no web panel command");
      return null;
    }
    return new TileWebPanels({ writer, list: new WebPanelList({ prefs, bar }), form: new WebPanelForm({ bar }), logger });
  }
  /**
   * @param favoriteId The id of the tile's bookmark.
   * @returns The command for the tile, or null for a page that is not `http` or `https`, or when the panel bar is not in the window.
   */
  async item(favoriteId) {
    const { writer, list, form, logger } = this.#deps;
    if (!list.available) {
      return null;
    }
    const address = await writer.get(favoriteId).then((node) => node.url ?? "", () => "");
    if (!/^https?:\/\//i.test(address)) {
      return null;
    }
    const id = await list.find(address);
    if (id !== null) {
      return { label: SHOW_WEB_PANEL_LABEL, run: () => void list.show(id) };
    }
    return { label: OPEN_WEB_PANEL_LABEL, run: () => void form.add(address).catch((error) => logger.error("Could not add the web panel", error)) };
  }
}
export {
  TileWebPanels
};
