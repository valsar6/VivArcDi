import { FavoriteDropZone } from "../../core/FavoriteDropZone.js";
import { LinkId } from "../../core/LinkId.js";
import { LinkDropZone } from "../../core/LinkDropZone.js";
import { RowDrag } from "../../core/RowDrag.js";
import { TabDragPill } from "../../core/TabDragPill.js";
import { TabDragRelease } from "../../core/TabDragRelease.js";
import { TodayList } from "../../core/TodayList.js";
import { DropPlace } from "./DropPlace.js";
import { DropTargets, LINK_ATTRIBUTE } from "./DropTargets.js";
import { FolderLinkTargets } from "./FolderLinkTargets.js";
import { LinkRemoval } from "./LinkRemoval.js";
import { PanelBookmarkDrop } from "./PanelBookmarkDrop.js";
import { FolderMenu } from "./FolderMenu.js";
import { FolderMenuItems } from "./FolderMenuItems.js";
import { RowMenu } from "./RowMenu.js";
import { TabDrops } from "./TabDrops.js";
class FolderDragDrop {
  #release;
  #rowDrag;
  #menus;
  #panelDrop;
  #zone;
  #linkTargets;
  #unregister = null;
  /**
   * Lets a tab of Vivaldi's list be released over a folder, between two rows of the section or on
   * the space header to become a link there, with the mouse or with an HTML5 drop, and a bookmark
   * or folder of the Bookmarks panel be dropped there to be copied. A link row can be dragged out
   * of the section onto today's list or the Favorites grid, through `LinkRemoval`, which its
   * right-click menu also offers as Remove pin and Tile tab, and a folder row has its own right-click menu; the rows of a live folder are not
   * bookmarks and stay where they are. A pill with the icon and the title
   * follows what is dragged. It marks the target under the pointer while either is dragged, and
   * offers the same places to the other modules through `LinkDropZone`.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor({ document, wrapperSelector, stripSelector, skipSelector, pill, menu, folderActions, section, header, tabs, writer, tabLinks, favorites, notify, indexBefore, logger }) {
    const targets = new DropTargets(section, header);
    const drops = new TabDrops({ tabs, favorites, indexBefore, logger });
    this.#release = new TabDragRelease({
      document,
      wrapperSelector,
      place: {
        at: (x, y) => targets.at(x, y),
        mark: (target) => targets.mark(target),
        clear: () => targets.clear(),
        release: (tabId, target) => void drops.drop(tabId, target)
      },
      ...new TabDragPill({ document, wrapperSelector, tabs, pill, logger }).hooks()
    });
    const removal = new LinkRemoval({
      tabs,
      writer,
      links: tabLinks,
      favorites,
      grid: FavoriteDropZone.of(document),
      today: new TodayList({ document, stripSelector, wrapperSelector, skipSelector }),
      notify,
      logger
    });
    this.#rowDrag = new RowDrag({
      document,
      container: section,
      selector: `[${LINK_ATTRIBUTE}]`,
      idAttribute: LINK_ATTRIBUTE,
      accepts: (linkId) => !LinkId.isVirtual(linkId),
      onMove: (_linkId, x, y) => removal.over(x, y),
      onDrop: (linkId, x, y) => void removal.release(linkId, x, y),
      onEnd: () => removal.clear(),
      pill
    });
    this.#menus = [new RowMenu({ document, menu, removal }), new FolderMenu({ document, menu, items: new FolderMenuItems(folderActions) })];
    this.#zone = LinkDropZone.of(document);
    this.#linkTargets = new FolderLinkTargets({ targets, place: new DropPlace(indexBefore), favorites, logger });
    this.#panelDrop = new PanelBookmarkDrop({ document, targets, place: new DropPlace(indexBefore), favorites });
  }
  /**
   * Starts following the mouse and the drag events, and offers the places to `LinkDropZone`.
   */
  start() {
    this.#release.start();
    this.#rowDrag.attach();
    this.#menus.forEach((menu) => menu.attach());
    this.#panelDrop.attach();
    this.#unregister = this.#zone.register(this.#linkTargets);
  }
  /**
   * Stops following the mouse and the drag events, removes the mark and withdraws the places.
   */
  stop() {
    this.#release.stop();
    this.#rowDrag.detach();
    this.#menus.forEach((menu) => menu.detach());
    this.#panelDrop.detach();
    this.#unregister?.();
    this.#unregister = null;
  }
}
export {
  FolderDragDrop
};
