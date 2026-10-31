import { ARCHIVE_FOOTER_ATTRIBUTE } from "./ArchivePanelView.js";
import { KeptElement } from "../../core/KeptElement.js";
class ArchiveButton {
  #kept;
  /**
   * A footer owned by VivArcDi at the bottom of the tab bar, after the tab list, with a button that
   * opens the archive. It is put back at the end when Vivaldi rebuilds the tab bar.
   *
   * @param document The browser window document.
   * @param containerSelector Selector of the element the footer ends, `#tabs-container`.
   * @param onOpen What a click does.
   * @param placement The watched root, and the watcher and frame scheduling replaceable in tests.
   */
  constructor(document, containerSelector, onOpen, placement) {
    const footer = document.createElement("div");
    footer.setAttribute(ARCHIVE_FOOTER_ATTRIBUTE, "");
    const button = document.createElement("button");
    button.setAttribute("type", "button");
    button.setAttribute("title", "Archive (Cmd/Ctrl+Shift+A)");
    button.textContent = "Archive";
    button.addEventListener("click", () => onOpen());
    footer.append(button);
    this.#kept = new KeptElement(footer, { ...placement, parent: () => document.querySelector(containerSelector) });
  }
  /**
   * Shows the footer.
   */
  start() {
    this.#kept.start();
  }
  /**
   * Removes the footer.
   */
  stop() {
    this.#kept.stop();
  }
}
export {
  ArchiveButton
};
