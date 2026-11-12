import { LinkId } from '../../core/LinkId.js';
import type { VirtualFolderHandlers } from '../../core/VirtualFolders.js';
import type { GithubConnect } from './GithubConnect.js';
import { CONNECT_ROW_ID } from './LiveEntries.js';
import type { LiveFolderMenu } from './LiveFolderMenu.js';
import type { LiveFolderPublisher } from './LiveFolderPublisher.js';
import type { LiveFolderRefresher } from './LiveFolderRefresher.js';
import type { LiveFolderStore } from './LiveFolderStore.js';
import type { LiveRowMenu } from './LiveRowMenu.js';

export interface LiveFolderHandlersDependencies {
  document: Document;
  store: Pick<LiveFolderStore, 'update'>;
  publisher: Pick<LiveFolderPublisher, 'publish'>;
  refresher: Pick<LiveFolderRefresher, 'refresh'>;
  folderMenu: Pick<LiveFolderMenu, 'open'>;
  rowMenu: Pick<LiveRowMenu, 'open'>;
  connect: Pick<GithubConnect, 'open'>;
}

export class LiveFolderHandlers implements VirtualFolderHandlers {
  #deps: LiveFolderHandlersDependencies;

  /**
   * What the live folders do with the clicks the folders section reports: a new name is stored, an
   * opened folder refreshes, a right click opens the menu of the folder or of the pull request, and
   * a click on the `Connect GitHub` row opens the panel below its folder instead of a tab.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: LiveFolderHandlersDependencies) {
    this.#deps = dependencies;
  }

  /**
   * @param id The id of a live folder.
   * @param name Its new name.
   */
  public rename(id: string, name: string): void {
    const folderId = LinkId.folderOf(id);
    if (folderId !== null && this.#deps.store.update(folderId, { name })) {
      this.#deps.publisher.publish();
    }
  }

  /**
   * @param id The id of a live folder the user opened.
   */
  public open(id: string): void {
    const folderId = LinkId.folderOf(id);
    if (folderId !== null) {
      this.#deps.refresher.refresh(folderId);
    }
  }

  /**
   * @param id The id of a live folder or of one of its rows.
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  public menu(id: string, x: number, y: number): void {
    const row = LinkId.rowOf(id);
    if (row === null) {
      this.#deps.folderMenu.open(id, x, y);
    } else if (row !== CONNECT_ROW_ID) {
      this.#deps.rowMenu.open(id, x, y);
    }
  }

  /**
   * @param id The id of a row the user clicked.
   * @returns Whether it was the `Connect GitHub` row, which opens the panel and no tab.
   */
  public activate(id: string): boolean {
    const folderId = LinkId.folderOf(id);
    if (LinkId.rowOf(id) !== CONNECT_ROW_ID || folderId === null) {
      return false;
    }
    const point = LiveFolderHandlers.below(this.#deps.document, LinkId.folder(folderId));
    this.#deps.connect.open(point?.x ?? 0, point?.y ?? 0);
    return true;
  }

  /**
   * @param document The browser window document.
   * @param linkId The id of a live folder row.
   * @returns The point just below the row of that folder, or null when it is not drawn.
   */
  public static below(document: Document, linkId: string): { x: number; y: number } | null {
    const row = document.querySelector<HTMLElement>(`[data-vivarcdi-folder-id="${linkId}"]`);
    const rect = row?.getBoundingClientRect();
    return rect === undefined ? null : { x: rect.left, y: rect.bottom };
  }
}
