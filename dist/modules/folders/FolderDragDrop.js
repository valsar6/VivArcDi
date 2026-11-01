import { DropTargets } from "./DropTargets.js";
import { TabDrops } from "./TabDrops.js";
import { TabPointerDrag } from "./TabPointerDrag.js";
class FolderDragDrop {
  #drag;
  /**
   * Lets a tab of Vivaldi's list be released over a folder, between two rows of the section or on
   * the space header to become a link there. It marks the target under the pointer while the tab
   * is dragged.
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
  }
  /**
   * Starts following the mouse.
   */
  start() {
    this.#drag.attach();
  }
  /**
   * Stops following the mouse and removes the mark.
   */
  stop() {
    this.#drag.detach();
  }
}
export {
  FolderDragDrop
};
