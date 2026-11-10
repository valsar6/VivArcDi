import { LinkDropZone } from "../../core/LinkDropZone.js";
import { DropPlace } from "./DropPlace.js";
import { DropTargets } from "./DropTargets.js";
import { FolderLinkTargets } from "./FolderLinkTargets.js";
import { PanelBookmarkDrop } from "./PanelBookmarkDrop.js";
import { TabDrops } from "./TabDrops.js";
import { TabPointerDrag } from "../../core/TabPointerDrag.js";
class FolderDragDrop {
  #drag;
  #panelDrop;
  #zone;
  #linkTargets;
  #unregister = null;
  /**
   * Lets a tab of Vivaldi's list be released over a folder, between two rows of the section or on
   * the space header to become a link there, and a bookmark or folder of the Bookmarks panel be
   * dropped there to be copied. It marks the target under the pointer while either is dragged, and
   * offers the same places to the other modules through `LinkDropZone`.
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
    this.#zone = LinkDropZone.of(document);
    this.#linkTargets = new FolderLinkTargets({ targets, place: new DropPlace(indexBefore), favorites, logger });
    this.#panelDrop = new PanelBookmarkDrop({ document, targets, place: new DropPlace(indexBefore), favorites });
  }
  /**
   * Starts following the mouse and the drag events, and offers the places to `LinkDropZone`.
   */
  start() {
    this.#drag.attach();
    this.#panelDrop.attach();
    this.#unregister = this.#zone.register(this.#linkTargets);
  }
  /**
   * Stops following the mouse and the drag events, removes the mark and withdraws the places.
   */
  stop() {
    this.#drag.detach();
    this.#panelDrop.detach();
    this.#unregister?.();
    this.#unregister = null;
  }
}
export {
  FolderDragDrop
};
