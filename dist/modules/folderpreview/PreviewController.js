import { LastOpenedStore } from "../reopen/LastOpenedStore.js";
import { FolderHover } from "./FolderHover.js";
import { FolderLinks } from "./FolderLinks.js";
import { PreviewPanelView } from "./PreviewPanelView.js";
import { PreviewRows } from "./PreviewRows.js";
import { PreviewSession } from "./PreviewSession.js";
import { PreviewText } from "./PreviewText.js";
const FOLDER_ROW = "[data-vivarcdi-folder-id]";
class PreviewController {
  #parts;
  #view;
  #hover;
  #generation = 0;
  #closeOnFolderClick = (event) => {
    if (this.#view.isOpen && event.target?.closest(FOLDER_ROW) != null) {
      this.dismiss();
    }
  };
  /**
   * Joins the hover, the data and the panel: when the pointer rests on a folder it reads the folder
   * and its dates and opens the panel, and a chosen row is opened through the link activator.
   *
   * @param parts The collaborators and settings.
   */
  constructor(parts) {
    this.#parts = parts;
    this.#view = new PreviewPanelView(parts.document, parts.parent, {
      onActivate: (row) => this.#activate(row),
      onClose: () => this.dismiss()
    });
    this.#hover = new FolderHover(parts.document, parts.delayMs, {
      onOpen: (folderId, row) => void this.#show(folderId, row),
      onClose: () => this.#close()
    });
  }
  /**
   * Starts listening to the pointer.
   */
  start() {
    this.#hover.start();
    this.#parts.document.addEventListener("click", this.#closeOnFolderClick, true);
  }
  /**
   * Removes the panel and every listener.
   */
  stop() {
    this.#hover.stop();
    this.#parts.document.removeEventListener("click", this.#closeOnFolderClick, true);
    this.#close();
  }
  /**
   * Closes the panel for a reason other than the pointer leaving.
   */
  dismiss() {
    this.#close();
    this.#hover.closed();
  }
  #close() {
    this.#generation += 1;
    this.#view.close();
  }
  #activate(row) {
    this.dismiss();
    void this.#parts.openLinks.refresh().then(() => this.#parts.activator.activate(row.link));
  }
  async #show(folderId, row) {
    const ticket = ++this.#generation;
    const { bookmarks, storage, logger, locale } = this.#parts;
    try {
      const content = FolderLinks.find(await bookmarks.getTree(), folderId);
      if (ticket !== this.#generation || content === null || content.links.length === 0) {
        return;
      }
      const dates = new LastOpenedStore(storage, logger);
      dates.load(/* @__PURE__ */ new Date());
      const bar = this.#parts.bar() ?? row;
      this.#view.open(
        { title: content.title, session: new PreviewSession(PreviewRows.build(content.links, dates)), texts: PreviewText.of(locale), locale, now: /* @__PURE__ */ new Date() },
        { row: row.getBoundingClientRect(), bar: bar.getBoundingClientRect() }
      );
    } catch (error) {
      logger.warn("could not read the folder for the panel", error);
    }
  }
}
export {
  PreviewController
};
