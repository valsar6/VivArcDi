import type { Logger } from '../../core/Logger.js';
import type { WorkspaceTabs } from '../../core/WorkspaceTabs.js';
import type { ArchiveEntry, ArchiveStore } from './ArchiveStore.js';

export class ArchiveRestorer {
  #workspaceTabs: Pick<WorkspaceTabs, 'open'>;
  #store: Pick<ArchiveStore, 'remove'>;
  #logger: Logger;

  /**
   * Reopens archived tabs.
   *
   * @param workspaceTabs Opens a tab in a workspace.
   * @param store The archive.
   * @param logger Logger for failures.
   */
  constructor(workspaceTabs: Pick<WorkspaceTabs, 'open'>, store: Pick<ArchiveStore, 'remove'>, logger: Logger) {
    this.#workspaceTabs = workspaceTabs;
    this.#store = store;
    this.#logger = logger;
  }

  /**
   * Opens the entry's address in a new active tab of its workspace, then removes the entry from
   * the archive. When the tab cannot be opened, the entry stays.
   *
   * @param entry An archive entry.
   */
  public async restore(entry: ArchiveEntry): Promise<void> {
    try {
      await this.#workspaceTabs.open(entry.url, entry.workspace);
    } catch (error) {
      this.#logger.warn('could not reopen the archived tab', error);
      return;
    }
    this.#store.remove(entry);
  }
}
