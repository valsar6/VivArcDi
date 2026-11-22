import { LinkLabels } from "../../core/browser/LinkLabels.js";
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
import { LabelCommands } from "../../shared/links/LabelCommands.js";
import { COPY_LINK_LABEL, DUPLICATE_LINK_LABEL } from "../../shared/tabs/CommandLabels.js";
import { TabTiler } from "../../shared/tabs/TabTiler.js";
import { LABEL_KEY_ATTRIBUTE, TILE_ATTRIBUTE, TILE_LABEL_ATTRIBUTE } from "./FavoritesView.js";
import { LinkedTabs } from "./LinkedTabs.js";
import { TileTab } from "./TileTab.js";
const PAGE_PREFIX = "page:";
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
    const { writer, tile, clipboard, dialog, store, notify, logger } = dependencies;
    this.#deps = dependencies;
    this.#pinned = new PinnedAddress({ writer, linkedTab: tile, dialog, notify, logger });
    this.#clipboard = new LinkClipboard({ writer, copier: clipboard, notify, logger });
    this.#duplication = new LinkDuplication({ writer, copier: new BookmarkCopier(writer), extras: new LinkExtras(store), notify, logger });
  }
  /**
   * @param context What the module may use.
   * @param notify Shows a message to the user.
   * @returns The commands wired to the window's bookmarks, tabs, clipboard and labels.
   */
  static of(context, notify) {
    const { document, selectors, tabs, runtime, storage, bookmarkWriter, logger } = context;
    const tile = new TileTab(new LinkedTabs(tabs));
    const store = LinkLabels.of(storage, logger);
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
      store,
      labels: LabelCommands.of(context, {
        keyOf: (id) => TileLinkCommands.#labelKeyOf(document, id),
        target: (id) => TileLinkCommands.#targetOf(document, id),
        textOf: (id) => TileLinkCommands.#textOf(document, id),
        pageOf: (id) => TileLinkCommands.#pageOf(context, tile, id),
        notify
      }),
      notify,
      logger
    });
  }
  /**
   * @param id The bookmark id of the tile that was clicked.
   * @returns Its link items in groups split by a separator, or the label items alone when its
   * bookmark cannot be read; none at all when it has neither.
   */
  async items(id) {
    const labels = this.#deps.labels?.items(id) ?? [];
    try {
      await this.#deps.writer.get(id);
    } catch (error) {
      this.#warn(id, error);
      return labels;
    }
    const [edit, split] = await Promise.all([this.#pinned.submenu(id), this.#deps.split.item(id)]);
    const duplicate = { label: DUPLICATE_LINK_LABEL, run: () => void this.#duplication.duplicate(id) };
    return [
      { label: COPY_LINK_LABEL, run: () => void this.#clipboard.copy(id) },
      { separator: true },
      ...labels,
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
  static #labelKeyOf(document, id) {
    return document.querySelector(`[${TILE_ATTRIBUTE}="${id}"]`)?.getAttribute(LABEL_KEY_ATTRIBUTE) ?? null;
  }
  static #targetOf(document, id) {
    const tile = document.querySelector(`[${TILE_ATTRIBUTE}="${id}"]`);
    return tile === null ? null : { anchor: tile, covers: false };
  }
  static #textOf(document, id) {
    return document.querySelector(`[${TILE_ATTRIBUTE}="${id}"]`)?.getAttribute(TILE_LABEL_ATTRIBUTE) ?? "";
  }
  static async #pageOf(context, tile, id) {
    try {
      const key = TileLinkCommands.#labelKeyOf(context.document, id);
      if (key?.startsWith(PAGE_PREFIX) === true) {
        const tab2 = await context.tabs.get(Number(id));
        const url2 = tab2.url ?? tab2.pendingUrl;
        return url2 === void 0 ? null : { url: url2, tab: tab2 };
      }
      const { url } = await context.bookmarkWriter.get(id);
      if (url === void 0) {
        return null;
      }
      const tab = await tile.of(id);
      return tab === void 0 ? { url } : { url, tab };
    } catch (error) {
      context.logger.warn("could not read the page of the tile", error);
      return null;
    }
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
