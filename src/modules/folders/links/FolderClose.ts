import type { FolderCloser } from './FolderCloser.js';
import type { OpenFolders } from '../tree/OpenFolders.js';

export class FolderClose {
  #closer: FolderCloser;
  #openFolders: OpenFolders;
  #redraw: () => void;

  /**
   * Closes the tabs a row minus stands for, then closes the folder and redraws on success.
   *
   * @param closer The tab closer.
   * @param openFolders The folders whose state is saved.
   * @param redraw What to call once the tabs are gone.
   */
  constructor(closer: FolderCloser, openFolders: OpenFolders, redraw: () => void) {
    this.#closer = closer;
    this.#openFolders = openFolders;
    this.#redraw = redraw;
  }

  /**
   * @param tabIds The tabs to close.
   * @param folderId The pressed folder, or undefined for a link row.
   * @param workspace The workspace shown when the press started.
   */
  public async apply(tabIds: number[], folderId: string | undefined, workspace: string | null): Promise<void> {
    if (!(await this.#closer.close(tabIds))) {
      return;
    }
    if (folderId !== undefined) {
      this.#openFolders.forget(folderId, workspace);
    }
    this.#redraw();
  }
}
