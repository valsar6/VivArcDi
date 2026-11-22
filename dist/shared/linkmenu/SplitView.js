import { TabData } from "../../core/tabs/TabData.js";
import { WorkspaceTabs } from "../../core/workspaces/WorkspaceTabs.js";
import { AddressField } from "../newtab/AddressField.js";
import { NewTabOpener } from "../newtab/NewTabOpener.js";
import { OPEN_IN_SPLIT_VIEW_LABEL } from "../tabs/CommandLabels.js";
import { TabTiler } from "../tabs/TabTiler.js";
import { BlankTabWatch } from "./BlankTabWatch.js";
import { LinkedTab } from "./LinkedTab.js";
const SPLIT_FAILED_TEXT = "Could not open the split view";
class SplitView {
  #deps;
  #workspaceTabs;
  #blank;
  #warned = false;
  /**
   * The `Open in Split View` command of a link row: tiles the page of the row, on the left, with the
   * selected ordinary tab, or, when the selected tab is a Favorites tile tab or there is none, with a
   * new blank tab on the right, and opens the address bar on that blank tab.
   *
   * @param deps What it reads and drives.
   */
  constructor(deps) {
    this.#deps = deps;
    this.#workspaceTabs = new WorkspaceTabs(deps.tabs, deps.logger);
    this.#blank = new BlankTabWatch(deps.tabs);
  }
  /**
   * @param context What the module may use.
   * @param notify Shows a toast.
   * @returns The command wired to the services of the module.
   */
  static of(context, notify) {
    const { document, selectors, tabs, runtime, bookmarkWriter, logger } = context;
    const address = new AddressField(document, selectors.get("addressField"));
    return new SplitView({
      tabs,
      newTab: new NewTabOpener(tabs, runtime, address),
      bookmarks: bookmarkWriter,
      address,
      tiler: new TabTiler(tabs),
      linked: new LinkedTab(tabs),
      notify,
      logger: logger.child("SplitView")
    });
  }
  /**
   * @param linkId The bookmark id of the link row.
   * @returns The menu item, disabled when the row is the selected tab or already tiled with it; null,
   * logged once, when tiling cannot be driven.
   */
  async item(linkId) {
    if (!this.#deps.tabs.available) {
      this.#warnOnce("chrome.tabs is not available");
      return null;
    }
    const [selected, row] = await Promise.all([this.#selected(), this.#deps.linked.of(linkId)]);
    return { label: OPEN_IN_SPLIT_VIEW_LABEL, run: () => void this.open(linkId), disabled: SplitView.#together(selected, row) };
  }
  /**
   * Tiles the page of the row, on the left, with the selected ordinary tab, or, without one, with a
   * new blank tab on the right whose address bar opens. A failure is logged and shown as an error toast.
   *
   * @param linkId The bookmark id of the link row.
   */
  async open(linkId) {
    this.#blank.stop();
    try {
      const selected = await this.#selected();
      const row = await this.#rowTab(linkId, selected);
      if (selected?.id === void 0 || TabData.ownOf(selected).favoriteId !== void 0) {
        await this.#tileWithBlank(row);
      } else {
        await this.#deps.tiler.tile([row, selected.id]);
      }
    } catch (error) {
      this.#deps.logger.warn("could not open the split view", error);
      this.#deps.notify(SPLIT_FAILED_TEXT, "error");
    }
  }
  /**
   * Stops waiting for a blank tab.
   */
  stop() {
    this.#blank.stop();
  }
  async #selected() {
    return (await this.#deps.tabs.query({ active: true, currentWindow: true }))[0];
  }
  async #rowTab(linkId, selected) {
    const existing = await this.#deps.linked.of(linkId);
    const tab = existing ?? await this.#open(linkId, selected);
    if (tab.id === void 0) {
      throw new Error("the tab of the row has no id");
    }
    return tab.id;
  }
  async #open(linkId, selected) {
    const { url } = await this.#deps.bookmarks.get(linkId);
    if (url === void 0) {
      throw new Error("the row has no address");
    }
    return this.#workspaceTabs.open(url, selected === void 0 ? null : TabData.of(selected), { bookmarkId: linkId });
  }
  async #tileWithBlank(row) {
    const blank = await this.#deps.newTab.create();
    if (blank.id === void 0) {
      throw new Error("the blank tab has no id");
    }
    await this.#deps.tiler.tile([row, blank.id]);
    this.#blank.start(blank.id, () => void this.#undo(row));
    this.#deps.address.focus();
  }
  async #undo(row) {
    try {
      await this.#deps.tiler.untile([row]);
    } catch (error) {
      this.#deps.logger.warn("could not undo the split view", error);
    }
  }
  #warnOnce(reason) {
    if (!this.#warned) {
      this.#warned = true;
      this.#deps.logger.warn(`Open in Split View is off: ${reason}`);
    }
  }
  static #together(selected, row) {
    if (selected === void 0 || row === void 0) {
      return false;
    }
    const group = SplitView.#groupOf(selected);
    return selected.id === row.id || group !== void 0 && group === SplitView.#groupOf(row);
  }
  static #groupOf(tab) {
    const tiling = TabData.extDataOf(tab)["tiling"];
    return typeof tiling === "object" && tiling !== null ? tiling.id : void 0;
  }
}
export {
  SPLIT_FAILED_TEXT,
  SplitView
};
