import type { ActiveWorkspace } from '../../../core/workspaces/ActiveWorkspace.js';
import type { FolderCloser } from './FolderCloser.js';
import type { OpenFolders } from '../tree/OpenFolders.js';

export class FolderClose {
  #closer: FolderCloser;
  #openFolders: OpenFolders;
  #redraw: () => void;
  #active: Pick<ActiveWorkspace, 'hold' | 'release'>;

  /**
   * Closes the tabs a row minus stands for, then closes the folder and redraws on success. The
   * shown workspace is held while the tabs close, so the activation Vivaldi performs on its own
   * after a removal does not move it.
   *
   * @param closer The tab closer.
   * @param openFolders The folders whose state is saved.
   * @param redraw What to call once the tabs are gone.
   * @param active The workspace state, held for the length of the close.
   */
  constructor(
    closer: FolderCloser,
    openFolders: OpenFolders,
    redraw: () => void,
    active: Pick<ActiveWorkspace, 'hold' | 'release'>,
  ) {
    this.#closer = closer;
    this.#openFolders = openFolders;
    this.#redraw = redraw;
    this.#active = active;
  }

  /**
   * @param tabIds The tabs to close.
   * @param folderId The pressed folder, or undefined for a link row.
   * @param workspace The workspace shown when the press started.
   */
  public async apply(tabIds: number[], folderId: string | undefined, workspace: string | null): Promise<void> {
    this.#active.hold();
    try {
      if (!(await this.#closer.close(tabIds))) {
        return;
      }
      if (folderId !== undefined) {
        this.#openFolders.forget(folderId, workspace);
      }
      this.#redraw();
    } finally {
      this.#active.release();
    }
  }
}
