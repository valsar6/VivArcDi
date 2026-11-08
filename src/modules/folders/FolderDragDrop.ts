import type { BrowserTabs } from '../../core/BrowserTabs.js';
import type { Logger } from '../../core/Logger.js';
import { DropPlace } from './DropPlace.js';
import { DropTargets } from './DropTargets.js';
import { PanelBookmarkDrop } from './PanelBookmarkDrop.js';
import { TabDrops } from './TabDrops.js';
import { TabPointerDrag } from '../../core/TabPointerDrag.js';
import type { WorkspaceFavorites } from './WorkspaceFavorites.js';

export interface FolderDragDropDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** Selector of Vivaldi's tab wrapper. */
  wrapperSelector: string;
  /** Gives the element of the folders section. */
  section: () => HTMLElement;
  /** Gives the element of the space header, if there is one. */
  header: () => HTMLElement | null;
  tabs: Pick<BrowserTabs, 'get'>;
  favorites: Pick<WorkspaceFavorites, 'add' | 'copy'>;
  /** Index among the children of the root of a bookmark; undefined for the end. */
  indexBefore: (bookmarkId: string | null) => number | undefined;
  logger: Logger;
}

export class FolderDragDrop {
  #drag: TabPointerDrag;
  #panelDrop: PanelBookmarkDrop;

  /**
   * Lets a tab of Vivaldi's list be released over a folder, between two rows of the section or on
   * the space header to become a link there, and a bookmark or folder of the Bookmarks panel be
   * dropped there to be copied. It marks the target under the pointer while either is dragged.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor({ document, wrapperSelector, section, header, tabs, favorites, indexBefore, logger }: FolderDragDropDependencies) {
    const targets = new DropTargets(section, header);
    const drops = new TabDrops({ tabs, favorites, indexBefore, logger });
    this.#drag = new TabPointerDrag({
      document,
      wrapperSelector,
      onMove: (x, y): void => targets.mark(targets.at(x, y)),
      onDrop: (tabId, x, y): void => void drops.drop(tabId, targets.at(x, y)),
      onEnd: (): void => targets.clear(),
    });
    this.#panelDrop = new PanelBookmarkDrop({ document, targets, place: new DropPlace(indexBefore), favorites });
  }

  /**
   * Starts following the mouse and the drag events.
   */
  public start(): void {
    this.#drag.attach();
    this.#panelDrop.attach();
  }

  /**
   * Stops following the mouse and the drag events, and removes the mark.
   */
  public stop(): void {
    this.#drag.detach();
    this.#panelDrop.detach();
  }
}
