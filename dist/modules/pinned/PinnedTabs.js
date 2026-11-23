import { Module } from "../../core/boot/Module.js";
import { ContextMenu } from "../../core/dom/ContextMenu.js";
import { PinnedAddress } from "../../shared/linkmenu/PinnedAddress.js";
import { PromptDialog } from "../../shared/linkmenu/PromptDialog.js";
import { PinnedClosing } from "./PinnedClosing.js";
import { PinnedMarking } from "./PinnedMarking.js";
import { PinnedMinus } from "./PinnedMinus.js";
import { PinnedPageLoader } from "./PinnedPageLoader.js";
import { PinnedRowMenu } from "./PinnedRowMenu.js";
import { PinWatcher } from "./PinWatcher.js";
import { PINNED_TABS_OPTIONS } from "./PinnedTabsOptions.js";
import { SavedAddresses } from "./SavedAddresses.js";
import { TabPinnedStore } from "./TabPinnedStore.js";
class PinnedTabs extends Module {
  static id = "pinned-tabs";
  static options = PINNED_TABS_OPTIONS;
  #watcher = null;
  #marking = null;
  #loader = null;
  #closing = null;
  #minus = null;
  #rowMenu = null;
  /**
   * Makes pinned tabs work as in Arc: each one remembers its own page and loads it again when
   * it is reopened, and is unloaded instead of closed. A separator follows the last pinned row,
   * and a right click on a row offers Edit Pinned Page, Close tab and Unpin tab.
   *
   * @param context What the module may use.
   */
  async start(context) {
    const { tabs, logger, options } = context;
    if (!tabs.available) {
      logger.warn("chrome.tabs is missing: pinned tabs are left to Vivaldi");
      return;
    }
    const addresses = new SavedAddresses(tabs);
    this.#watcher = new PinWatcher(tabs, addresses, logger);
    this.#marking = new PinnedMarking(context);
    this.#loader = new PinnedPageLoader(tabs, logger);
    this.#rowMenu = PinnedTabs.#buildRowMenu(context);
    await this.#watcher.start();
    await this.#marking.start();
    await this.#loader.start();
    this.#rowMenu.start();
    if (options.unloadOnClose) {
      this.#closing = new PinnedClosing(context);
      this.#minus = new PinnedMinus({ document: context.document, selectors: context.selectors, tabs, logger });
      await this.#closing.start();
      this.#minus.start();
    }
  }
  /**
   * Removes every mark and listener, leaving Vivaldi's tab bar as it was.
   */
  stop() {
    this.#rowMenu?.stop();
    this.#minus?.stop();
    this.#closing?.stop();
    this.#loader?.stop();
    this.#marking?.stop();
    this.#watcher?.stop();
    this.#rowMenu = null;
    this.#minus = null;
    this.#closing = null;
    this.#loader = null;
    this.#marking = null;
    this.#watcher = null;
  }
  static #buildRowMenu(context) {
    const { document, selectors, tabs, notices, logger } = context;
    const parent = () => document.querySelector(selectors.get("browser")) ?? document.body;
    return new PinnedRowMenu({
      document,
      menu: new ContextMenu({ document, parent }),
      selectors,
      tabs,
      address: new PinnedAddress({
        store: new TabPinnedStore(tabs),
        dialog: new PromptDialog({ document, parent }),
        notify: (text, kind) => notices.show(text, kind),
        logger
      }),
      logger
    });
  }
}
export {
  PinnedTabs
};
