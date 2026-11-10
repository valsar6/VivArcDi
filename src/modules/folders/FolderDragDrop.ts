import type { BrowserTabs } from '../../core/BrowserTabs.js';
import { LinkDropZone } from '../../core/LinkDropZone.js';
import type { Logger } from '../../core/Logger.js';
import { DropPlace } from './DropPlace.js';
import { DropTargets } from './DropTargets.js';
import { FolderLinkTargets } from './FolderLinkTargets.js';
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
  favorites: Pick<WorkspaceFavorites, 'add' | 'addLink' | 'copy'>;
  /** Index among the children of the root of a bookmark; undefined for the end. */
  indexBefore: (bookmarkId: string | null) => number | undefined;
  logger: Logger;
}

export class FolderDragDrop {
  #drag: TabPointerDrag;
  #panelDrop: PanelBookmarkDrop;
  #zone: LinkDropZone;
  #linkTargets: FolderLinkTargets;
  #unregister: (() => void) | null = null;

  /**
   * Lets a tab of Vivaldi's list be released over a folder, between two rows of the section or on
   * the space header to become a link there, and a bookmark or folder of the Bookmarks panel be
   * dropped there to be copied. It marks the target under the pointer while either is dragged, and
   * offers the same places to the other modules through `LinkDropZone`.
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
    this.#zone = LinkDropZone.of(document);
    this.#linkTargets = new FolderLinkTargets({ targets, place: new DropPlace(indexBefore), favorites, logger });
    this.#panelDrop = new PanelBookmarkDrop({ document, targets, place: new DropPlace(indexBefore), favorites });
  }

  /**
   * Starts following the mouse and the drag events, and offers the places to `LinkDropZone`.
   */
  public start(): void {
    this.#drag.attach();
    this.#panelDrop.attach();
    this.#unregister = this.#zone.register(this.#linkTargets);
  }

  /**
   * Stops following the mouse and the drag events, removes the mark and withdraws the places.
   */
  public stop(): void {
    this.#drag.detach();
    this.#panelDrop.detach();
    this.#unregister?.();
    this.#unregister = null;
  }
}
