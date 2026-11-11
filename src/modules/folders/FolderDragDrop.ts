import type { BookmarkWriter } from '../../core/bookmarks/BookmarkWriter.js';
import type { ContextMenu } from '../../core/ContextMenu.js';
import type { DragPill } from '../../core/DragPill.js';
import { FavoriteDropZone } from '../../core/FavoriteDropZone.js';
import { LinkDropZone } from '../../core/LinkDropZone.js';
import type { Logger } from '../../core/Logger.js';
import { RowDrag } from '../../core/RowDrag.js';
import { TabDragPill } from '../../core/TabDragPill.js';
import { TabDragRelease } from '../../core/TabDragRelease.js';
import { TodayList } from '../../core/TodayList.js';
import { DropPlace } from './DropPlace.js';
import { DropTargets, LINK_ATTRIBUTE } from './DropTargets.js';
import type { DropTarget } from './DropTargets.js';
import { FolderLinkTargets } from './FolderLinkTargets.js';
import { LinkRemoval } from './LinkRemoval.js';
import type { LinkRemovalTabs } from './LinkRemoval.js';
import { PanelBookmarkDrop } from './PanelBookmarkDrop.js';
import { RowMenu } from './RowMenu.js';
import { TabDrops } from './TabDrops.js';
import type { TabLinks } from './TabLinks.js';
import type { WorkspaceFavorites } from './WorkspaceFavorites.js';

export interface FolderDragDropDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** Selector of Vivaldi's tab wrapper. */
  wrapperSelector: string;
  /** Selector of Vivaldi's tab list. */
  stripSelector: string;
  /** Selector of the slots of the tab list that are not today's tabs. */
  skipSelector: string;
  /** The pill that follows the pointer while something is dragged. */
  pill: Pick<DragPill, 'show' | 'move' | 'hide'>;
  /** The menu of a link row. */
  menu: Pick<ContextMenu, 'open' | 'close'>;
  /** Gives the element of the folders section. */
  section: () => HTMLElement;
  /** Gives the element of the space header, if there is one. */
  header: () => HTMLElement | null;
  tabs: LinkRemovalTabs;
  writer: Pick<BookmarkWriter, 'get'>;
  /** Writes the link between a tab and a bookmark. */
  tabLinks: Pick<TabLinks, 'link' | 'unlink'>;
  favorites: Pick<WorkspaceFavorites, 'add' | 'addLink' | 'copy' | 'take'>;
  /** Shows a short message to the user. */
  notify: (text: string) => void;
  /** Index among the children of the root of a bookmark; undefined for the end. */
  indexBefore: (bookmarkId: string | null) => number | undefined;
  logger: Logger;
}

export class FolderDragDrop {
  #release: TabDragRelease<DropTarget>;
  #rowDrag: RowDrag;
  #rowMenu: RowMenu;
  #panelDrop: PanelBookmarkDrop;
  #zone: LinkDropZone;
  #linkTargets: FolderLinkTargets;
  #unregister: (() => void) | null = null;

  /**
   * Lets a tab of Vivaldi's list be released over a folder, between two rows of the section or on
   * the space header to become a link there, with the mouse or with an HTML5 drop, and a bookmark
   * or folder of the Bookmarks panel be dropped there to be copied. A link row can be dragged out
   * of the section onto today's list or the Favorites grid, through `LinkRemoval`, which its
   * right-click menu also offers as Remove pin and Tile tab. A pill with the icon and the title
   * follows what is dragged. It marks the target under the pointer while either is dragged, and
   * offers the same places to the other modules through `LinkDropZone`.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor({ document, wrapperSelector, stripSelector, skipSelector, pill, menu, section, header, tabs, writer, tabLinks, favorites, notify, indexBefore, logger }: FolderDragDropDependencies) {
    const targets = new DropTargets(section, header);
    const drops = new TabDrops({ tabs, favorites, indexBefore, logger });
    this.#release = new TabDragRelease<DropTarget>({
      document,
      wrapperSelector,
      place: {
        at: (x, y): DropTarget | null => targets.at(x, y),
        mark: (target): void => targets.mark(target),
        clear: (): void => targets.clear(),
        release: (tabId, target): void => void drops.drop(tabId, target),
      },
      ...new TabDragPill({ document, wrapperSelector, tabs, pill, logger }).hooks(),
    });
    const removal = new LinkRemoval({
      tabs,
      writer,
      links: tabLinks,
      favorites,
      grid: FavoriteDropZone.of(document),
      today: new TodayList({ document, stripSelector, wrapperSelector, skipSelector }),
      notify,
      logger,
    });
    this.#rowDrag = new RowDrag({
      document,
      container: section,
      selector: `[${LINK_ATTRIBUTE}]`,
      idAttribute: LINK_ATTRIBUTE,
      onMove: (_linkId, x, y): void => removal.over(x, y),
      onDrop: (linkId, x, y): void => void removal.release(linkId, x, y),
      onEnd: (): void => removal.clear(),
      pill,
    });
    this.#rowMenu = new RowMenu({ document, menu, removal });
    this.#zone = LinkDropZone.of(document);
    this.#linkTargets = new FolderLinkTargets({ targets, place: new DropPlace(indexBefore), favorites, logger });
    this.#panelDrop = new PanelBookmarkDrop({ document, targets, place: new DropPlace(indexBefore), favorites });
  }

  /**
   * Starts following the mouse and the drag events, and offers the places to `LinkDropZone`.
   */
  public start(): void {
    this.#release.start();
    this.#rowDrag.attach();
    this.#rowMenu.attach();
    this.#panelDrop.attach();
    this.#unregister = this.#zone.register(this.#linkTargets);
  }

  /**
   * Stops following the mouse and the drag events, removes the mark and withdraws the places.
   */
  public stop(): void {
    this.#release.stop();
    this.#rowDrag.detach();
    this.#rowMenu.detach();
    this.#panelDrop.detach();
    this.#unregister?.();
    this.#unregister = null;
  }
}
