import { DropPlace } from "./DropPlace.js";
import { DropTargets } from "./DropTargets.js";
import { PanelBookmarkDrop } from "./PanelBookmarkDrop.js";
import { TabDrops } from "./TabDrops.js";
import { TabPointerDrag } from "../../core/TabPointerDrag.js";
class FolderDragDrop {
  #drag;
  #panelDrop;
  /**
   * Lets a tab of Vivaldi's list be released over a folder, between two rows of the section or on
   * the space header to become a link there, and a bookmark or folder of the Bookmarks panel be
   * dropped there to be copied. It marks the target under the pointer while either is dragged.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor({ document, wrapperSelector, section, header, tabs, favorites, indexBefore, logger }) {
    const targets = new DropTargets(section, header);
    const drops = new TabDrops({ tabs, favorites, indexBefore, logger });
    this.#drag = new TabPointerDrag({
      document,
      wrapperSelector,
      onMove: (x, y) => targets.mark(targets.at(x, y)),
      onDrop: (tabId, x, y) => void drops.drop(tabId, targets.at(x, y)),
      onEnd: () => targets.clear()
    });
    this.#panelDrop = new PanelBookmarkDrop({ document, targets, place: new DropPlace(indexBefore), favorites });
  }
  /**
   * Starts following the mouse and the drag events.
   */
  start() {
    this.#drag.attach();
    this.#panelDrop.attach();
  }
  /**
   * Stops following the mouse and the drag events, and removes the mark.
   */
  stop() {
    this.#drag.detach();
    this.#panelDrop.detach();
  }
}
export {
  FolderDragDrop
};
