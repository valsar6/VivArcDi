import { LabelKeys, LinkLabels } from "../../../core/browser/LinkLabels.js";
import { TextCopier } from "../../../shared/clipboard/TextCopier.js";
import { BookmarkCopier } from "../../../shared/linkmenu/BookmarkCopier.js";
import { BookmarkPinnedStore } from "../../../shared/linkmenu/BookmarkPinnedStore.js";
import { LinkClipboard } from "../../../shared/linkmenu/LinkClipboard.js";
import { LinkDuplication } from "../../../shared/linkmenu/LinkDuplication.js";
import { LinkExtras } from "../../../shared/linkmenu/LinkExtras.js";
import { LinkedTab } from "../../../shared/linkmenu/LinkedTab.js";
import { LabelCommands } from "../../../shared/links/LabelCommands.js";
import { LinkRelocationFactory } from "./LinkRelocationFactory.js";
import { PinnedAddress } from "../../../shared/linkmenu/PinnedAddress.js";
import { PromptDialog } from "../../../shared/linkmenu/PromptDialog.js";
import { SplitView } from "../../../shared/linkmenu/SplitView.js";
class SavedTabActions {
  #context;
  #sources;
  #stops = [];
  #pinned = null;
  #split;
  #relocation = null;
  #labelCommands = null;
  /**
   * The items of the menu of a saved tab that Arc has besides Remove pin and Tile tab: Copy Link,
   * Change Icon, Rename, Edit Pinned Page, Open in Split View, Duplicate and Move to. Each one
   * builds its collaborators the first time the menu asks for it.
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
   * @returns The seven actions the menu of a saved tab is built from.
   */
  create(toast) {
    const labels = this.#labelCommandsFor(toast);
    return {
      copyLink: (linkId) => this.#copyLink(linkId, toast),
      changeIcon: (linkId) => labels.items(linkId)[0] ?? null,
      rename: (linkId) => labels.items(linkId)[1] ?? null,
      editPinnedPage: (linkId) => this.#editPinnedPage(linkId, toast),
      openInSplitView: (linkId) => this.#openInSplitView(linkId, toast),
      duplicate: (linkId) => this.#duplicate(linkId, toast),
      moveTo: (linkId) => this.#moveTo(linkId)
    };
  }
  #labelCommandsFor(toast) {
    this.#labelCommands ??= LabelCommands.of(this.#context, {
      keyOf: (linkId) => LabelKeys.bookmark(linkId),
      target: (linkId) => this.#rowTarget(linkId),
      textOf: (linkId) => this.#rowTarget(linkId)?.anchor.textContent ?? "",
      pageOf: (linkId) => this.#pageOf(linkId),
      notify: toast
    });
    return this.#labelCommands;
  }
  #rowTarget(linkId) {
    const { document } = this.#context;
    const anchor = document.querySelector(`[data-vivarcdi-link-id="${linkId}"] .vivarcdi-folders-title`);
    return anchor === null ? null : { anchor, covers: true };
  }
  async #pageOf(linkId) {
    try {
      const { url } = await this.#context.bookmarkWriter.get(linkId);
      if (url === void 0) {
        return null;
      }
      const tab = await new LinkedTab(this.#context.tabs).of(linkId);
      return tab === void 0 ? { url } : { url, tab };
    } catch (error) {
      this.#context.logger.warn("could not read the page of the link", error);
      return null;
    }
  }
  #copyLink(linkId, notify) {
    const { document, bookmarkWriter, logger } = this.#context;
    const clipboard = new LinkClipboard({ writer: bookmarkWriter, copier: TextCopier.for(document, document.defaultView?.navigator.clipboard), notify, logger });
    return { label: "Copy Link", run: () => void clipboard.copy(linkId) };
  }
  async #editPinnedPage(linkId, notify) {
    const { document, selectors, tabs, bookmarkWriter, logger } = this.#context;
    this.#pinned ??= new PinnedAddress({
      store: new BookmarkPinnedStore({ writer: bookmarkWriter, linkedTab: new LinkedTab(tabs) }),
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
    const { bookmarkWriter, storage, logger } = this.#context;
    const extras = new LinkExtras(LinkLabels.of(storage, logger));
    const duplication = new LinkDuplication({ writer: bookmarkWriter, copier: new BookmarkCopier(bookmarkWriter), extras, notify, logger });
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
