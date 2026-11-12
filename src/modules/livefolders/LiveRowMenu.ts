import type { ContextMenu } from '../../core/ContextMenu.js';
import { LinkId } from '../../core/LinkId.js';
import type { TextCopier } from '../../shared/clipboard/TextCopier.js';
import type { LiveFolderStore } from './LiveFolderStore.js';

export interface LiveRowMenuDependencies {
  menu: Pick<ContextMenu, 'open'>;
  store: Pick<LiveFolderStore, 'find' | 'update'>;
  copier: Pick<TextCopier, 'write'>;
  /** Shows a short message at the bottom of the window. */
  toast: (text: string) => void;
  /** Called after a row was archived, so that the folder is drawn again. */
  changed: () => void;
}

export const COPY_LINK_LABEL = 'Copy Link';
export const ARCHIVE_LABEL = 'Archive Pull Request';
export const COPIED_TEXT = 'Copied';
export const COPY_FAILED_TEXT = 'Copy failed';

export class LiveRowMenu {
  #deps: LiveRowMenuDependencies;

  /**
   * The menu of a pull-request row of a live folder: `Copy Link` copies the address of the pull
   * request and confirms it with a toast, and `Archive Pull Request` hides it from the folder until
   * it is updated on GitHub. Nothing here touches a bookmark.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: LiveRowMenuDependencies) {
    this.#deps = dependencies;
  }

  /**
   * Opens the menu of a pull-request row.
   *
   * @param linkId The id of the row.
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  public open(linkId: string, x: number, y: number): void {
    const folderId = LinkId.folderOf(linkId);
    const rowId = LinkId.rowOf(linkId);
    const row = folderId === null ? undefined : this.#deps.store.find(folderId)?.rows.find((candidate) => candidate.id === rowId);
    if (folderId === null || row === undefined) {
      return;
    }
    this.#deps.menu.open(
      [
        { label: COPY_LINK_LABEL, run: (): void => this.#copy(row.url) },
        { label: ARCHIVE_LABEL, run: (): void => this.#archive(folderId, row.id) },
      ],
      x,
      y,
    );
  }

  #copy(url: string): void {
    this.#deps.copier.write(url).then(
      () => this.#deps.toast(COPIED_TEXT),
      () => this.#deps.toast(COPY_FAILED_TEXT),
    );
  }

  #archive(folderId: string, rowId: string): void {
    const folder = this.#deps.store.find(folderId);
    const row = folder?.rows.find((candidate) => candidate.id === rowId);
    if (folder === undefined || row === undefined) {
      return;
    }
    this.#deps.store.update(folderId, { rows: folder.rows.filter((candidate) => candidate.id !== rowId), archived: { ...folder.archived, [rowId]: row.updatedAt } });
    this.#deps.changed();
  }
}
