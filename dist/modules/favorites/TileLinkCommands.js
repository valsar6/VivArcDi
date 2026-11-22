import { TextCopier } from "../../shared/clipboard/TextCopier.js";
import { AddressField } from "../../shared/newtab/AddressField.js";
import { NewTabOpener } from "../../shared/newtab/NewTabOpener.js";
import { BookmarkCopier } from "../../shared/linkmenu/BookmarkCopier.js";
import { LinkClipboard } from "../../shared/linkmenu/LinkClipboard.js";
import { LinkDuplication } from "../../shared/linkmenu/LinkDuplication.js";
import { LinkExtras } from "../../shared/linkmenu/LinkExtras.js";
import { PinnedAddress } from "../../shared/linkmenu/PinnedAddress.js";
import { PromptDialog } from "../../shared/linkmenu/PromptDialog.js";
import { SplitView } from "../../shared/linkmenu/SplitView.js";
import { COPY_LINK_LABEL, DUPLICATE_LINK_LABEL } from "../../shared/tabs/CommandLabels.js";
import { TabTiler } from "../../shared/tabs/TabTiler.js";
import { LinkedTabs } from "./LinkedTabs.js";
import { TileTab } from "./TileTab.js";
class TileLinkCommands {
  #deps;
  #pinned;
  #clipboard;
  #duplication;
  #warned = /* @__PURE__ */ new Set();
  /**
   * The link commands of the menu of a tile: Copy Link, Edit Pinned Page, Open in Split View and
   * Duplicate, the ones of a saved tab built for the bookmark and the open tab of a tile.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    const { writer, tile, clipboard, dialog, notify, logger } = dependencies;
    this.#deps = dependencies;
    this.#pinned = new PinnedAddress({ writer, linkedTab: tile, dialog, notify, logger });
    this.#clipboard = new LinkClipboard({ writer, copier: clipboard, notify, logger });
    this.#duplication = new LinkDuplication({ writer, copier: new BookmarkCopier(writer), extras: new LinkExtras(), notify, logger });
  }
  /**
   * @param context What the module may use.
   * @param notify Shows a message to the user.
   * @returns The commands wired to the window's bookmarks, tabs and clipboard.
   */
  static of(context, notify) {
    const { document, selectors, tabs, runtime, bookmarkWriter, logger } = context;
    const tile = new TileTab(new LinkedTabs(tabs));
    const address = new AddressField(document, selectors.get("addressField"));
    const split = new SplitView({
      tabs,
      newTab: new NewTabOpener(tabs, runtime, address),
      bookmarks: bookmarkWriter,
      address,
      tiler: new TabTiler(tabs),
      linked: tile,
      notify,
      logger: logger.child("SplitView")
    });
    return new TileLinkCommands({
      writer: bookmarkWriter,
      tile,
      clipboard: TextCopier.for(document, document.defaultView?.navigator.clipboard),
      dialog: new PromptDialog({ document, parent: () => document.querySelector(selectors.get("browser")) ?? document.body }),
      split,
      notify,
      logger
    });
  }
  /**
   * @param id The bookmark id of the tile that was clicked.
   * @returns Its link items in groups split by a separator, or none when its bookmark cannot be read.
   */
  async items(id) {
    try {
      await this.#deps.writer.get(id);
    } catch (error) {
      this.#warn(id, error);
      return [];
    }
    const [edit, split] = await Promise.all([this.#pinned.submenu(id), this.#deps.split.item(id)]);
    const duplicate = { label: DUPLICATE_LINK_LABEL, run: () => void this.#duplication.duplicate(id) };
    return [
      { label: COPY_LINK_LABEL, run: () => void this.#clipboard.copy(id) },
      { separator: true },
      edit,
      { separator: true },
      ...split === null ? [] : [split],
      duplicate
    ];
  }
  /**
   * Stops what the commands started.
   */
  stop() {
    this.#deps.split.stop();
  }
  #warn(id, error) {
    if (!this.#warned.has(id)) {
      this.#warned.add(id);
      this.#deps.logger.warn(`The tile ${id} cannot be read: its menu has no link commands`, error);
    }
  }
}
export {
  TileLinkCommands
};
