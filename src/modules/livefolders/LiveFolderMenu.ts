import type { CommandItem, ContextMenu, MenuItem } from '../../core/dom/ContextMenu.js';
import { LinkId } from '../../shared/links/LinkId.js';
import { PullRequestFilters } from './PullRequestFilters.js';
import type { ToggleName } from './PullRequestFilters.js';
import type { LiveFolderStore } from './LiveFolderStore.js';
import type { RepositoryEditor } from './RepositoryEditor.js';

export interface MenuPoint {
  x: number;
  y: number;
}

export interface LiveFolderMenuDependencies {
  menu: Pick<ContextMenu, 'open'>;
  editor: Pick<RepositoryEditor, 'open'>;
  store: Pick<LiveFolderStore, 'find' | 'update'>;
  /** Refreshes one folder of the store. */
  refresh: (folderId: string) => void;
  /** Deletes one folder of the store, with its rows. */
  remove: (folderId: string) => void;
  /** Whether GitHub is connected, which decides whether the menu offers `Disconnect GitHub`. */
  connected: () => boolean;
  /** Forgets the connection to GitHub. */
  disconnect: () => void;
  /** Where the repositories field opens for a live folder row, or null to open it at the pointer. */
  anchor: (linkId: string) => MenuPoint | null;
}

const FILTER_LABELS: ReadonlyArray<readonly [ToggleName, string]> = [
  ['createdByMe', 'Created By Me'],
  ['reviewRequests', 'Review Requests'],
  ['drafts', 'Drafts'],
];
const PULL_REQUESTS_LABEL = 'Pull Requests';
const REPOSITORIES_LABEL = 'Repositories…';
const REFRESH_LABEL = 'Refresh';
export const DISCONNECT_LABEL = 'Disconnect GitHub';
const DELETE_LABEL = 'Delete Live Folder';

export class LiveFolderMenu {
  #deps: LiveFolderMenuDependencies;

  /**
   * The menu of a live folder: `Pull Requests` with the three filters as check items and
   * `Repositories…`, then `Refresh`, `Disconnect GitHub` while GitHub is connected, and
   * `Delete Live Folder`. A filter change is stored and the
   * folder refreshes at once.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: LiveFolderMenuDependencies) {
    this.#deps = dependencies;
  }

  /**
   * Opens the menu of a live folder.
   *
   * @param linkId The id of the folder row.
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  public open(linkId: string, x: number, y: number): void {
    const folderId = LinkId.folderOf(linkId);
    const folder = folderId === null ? undefined : this.#deps.store.find(folderId);
    if (folderId === null || folder === undefined) {
      return;
    }
    const filters = FILTER_LABELS.map(([name, label]): CommandItem => ({ label, checked: folder.filters[name], run: (): void => this.#toggle(folderId, name) }));
    const repositories: CommandItem = { label: REPOSITORIES_LABEL, run: (): void => this.#editRepositories(folderId, linkId, { x, y }) };
    const disconnect: MenuItem[] = this.#deps.connected() ? [{ label: DISCONNECT_LABEL, run: (): void => this.#deps.disconnect() }] : [];
    const items: MenuItem[] = [
      { label: PULL_REQUESTS_LABEL, items: [...filters, repositories] },
      { label: REFRESH_LABEL, run: (): void => this.#deps.refresh(folderId) },
      ...disconnect,
      { label: DELETE_LABEL, run: (): void => this.#deps.remove(folderId) },
    ];
    this.#deps.menu.open(items, x, y);
  }

  #toggle(folderId: string, name: ToggleName): void {
    const folder = this.#deps.store.find(folderId);
    if (folder !== undefined) {
      this.#deps.store.update(folderId, { filters: PullRequestFilters.toggled(folder.filters, name) });
      this.#deps.refresh(folderId);
    }
  }

  #editRepositories(folderId: string, linkId: string, pointer: MenuPoint): void {
    const folder = this.#deps.store.find(folderId);
    if (folder === undefined) {
      return;
    }
    const { x, y } = this.#deps.anchor(linkId) ?? pointer;
    this.#deps.editor.open(x, y, folder.filters.repositories, (repositories) => this.#saveRepositories(folderId, repositories));
  }

  #saveRepositories(folderId: string, repositories: string[]): void {
    const folder = this.#deps.store.find(folderId);
    if (folder !== undefined) {
      this.#deps.store.update(folderId, { filters: { ...folder.filters, repositories } });
      this.#deps.refresh(folderId);
    }
  }
}
