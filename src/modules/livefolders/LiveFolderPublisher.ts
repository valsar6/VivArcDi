import type { VirtualFolders } from '../../core/VirtualFolders.js';
import { LiveEntries } from './LiveEntries.js';
import type { LiveFolderStore } from './LiveFolderStore.js';

export class LiveFolderPublisher {
  #store: Pick<LiveFolderStore, 'workspaces' | 'folders'>;
  #virtual: Pick<VirtualFolders, 'set'>;
  #published = new Set<string | null>();

  /**
   * Puts the live folders of the store where the folders section reads them. Workspaces that lost
   * their last folder are emptied.
   *
   * @param store The stored live folders.
   * @param virtual The state shared with the folders section.
   */
  constructor(store: Pick<LiveFolderStore, 'workspaces' | 'folders'>, virtual: Pick<VirtualFolders, 'set'>) {
    this.#store = store;
    this.#virtual = virtual;
  }

  /**
   * Publishes the current folders of every workspace.
   */
  public publish(): void {
    const now = new Set(this.#store.workspaces);
    for (const workspace of new Set([...now, ...this.#published])) {
      this.#virtual.set(workspace, this.#store.folders(workspace).map((folder) => LiveEntries.folder(folder)));
    }
    this.#published = now;
  }

  /**
   * Removes every live folder from the section; the store keeps them.
   */
  public clear(): void {
    this.#published.forEach((workspace) => this.#virtual.set(workspace, []));
    this.#published.clear();
  }
}
