import { TextCopier } from "../../../shared/clipboard/TextCopier.js";
import { BookmarkCopier } from "./BookmarkCopier.js";
import { LinkClipboard } from "./LinkClipboard.js";
import { LinkDuplication } from "./LinkDuplication.js";
import { LinkExtras } from "./LinkExtras.js";
import { LinkedTab } from "./LinkedTab.js";
import { LinkRelocationFactory } from "./LinkRelocationFactory.js";
import { PinnedAddress } from "./PinnedAddress.js";
import { PromptDialog } from "./PromptDialog.js";
import { SplitView } from "./SplitView.js";
class SavedTabActions {
  #context;
  #sources;
  #stops = [];
  #pinned = null;
  #split;
  #relocation = null;
  /**
   * The items of the menu of a saved tab that Arc has besides Remove pin and Tile tab: Copy Link,
   * Edit Pinned Page, Open in Split View, Duplicate and Move to. Each one builds its collaborators
   * the first time the menu asks for it.
   *
   * @param context What the module may use.
   * @param sources What it reads from the section.
   */
  constructor(context, sources) {
    this.#context = context;
    this.#sources = sources;
  }
  /**
   * @param toast Shows a message to the user.
   * @returns The five actions the menu of a saved tab is built from.
   */
  create(toast) {
    return {
      copyLink: (linkId) => this.#copyLink(linkId, toast),
      editPinnedPage: (linkId) => this.#editPinnedPage(linkId, toast),
      openInSplitView: (linkId) => this.#openInSplitView(linkId, toast),
      duplicate: (linkId) => this.#duplicate(linkId, toast),
      moveTo: (linkId) => this.#moveTo(linkId)
    };
  }
  #copyLink(linkId, notify) {
    const { document, bookmarkWriter, logger } = this.#context;
    const clipboard = new LinkClipboard({ writer: bookmarkWriter, copier: TextCopier.for(document, document.defaultView?.navigator.clipboard), notify, logger });
    return { label: "Copy Link", run: () => void clipboard.copy(linkId) };
  }
  async #editPinnedPage(linkId, notify) {
    const { document, selectors, tabs, bookmarkWriter, logger } = this.#context;
    this.#pinned ??= new PinnedAddress({
      writer: bookmarkWriter,
      linkedTab: new LinkedTab(tabs),
      dialog: new PromptDialog({ document, parent: () => document.querySelector(selectors.get("browser")) ?? document.body }),
      notify,
      logger
    });
    return this.#pinned.submenu(linkId);
  }
  #openInSplitView(linkId, notify) {
    return this.#splitView(notify).item(linkId);
  }
  #splitView(notify) {
    if (this.#split === void 0) {
      const split = SplitView.of(this.#context, notify);
      this.#stops.push(() => {
        split.stop();
        this.#split = void 0;
      });
      this.#split = split;
    }
    return this.#split;
  }
  #duplicate(linkId, notify) {
    const { bookmarkWriter, logger } = this.#context;
    const duplication = new LinkDuplication({ writer: bookmarkWriter, copier: new BookmarkCopier(bookmarkWriter), extras: new LinkExtras(), notify, logger });
    return { label: "Duplicate", run: () => void duplication.duplicate(linkId) };
  }
  #moveTo(linkId) {
    if (this.#relocation === null) {
      const relocation = LinkRelocationFactory.create({ context: this.#context, sources: this.#sources });
      if (relocation === null) {
        return null;
      }
      this.#relocation = relocation;
      this.#stops.push(() => {
        relocation.dispose();
        this.#relocation = null;
      });
    }
    return this.#relocation.submenu(linkId);
  }
  /**
   * Stops what the actions started.
   */
  stop() {
    this.#stops.reverse().forEach((stop) => stop());
    this.#stops = [];
  }
}
export {
  SavedTabActions
};
