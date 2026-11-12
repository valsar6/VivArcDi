import { AddressKey } from '../../core/AddressKey.js';
import type { FolderEntry, LinkEntry } from '../../core/FolderEntries.js';
import { LinkId } from '../../core/LinkId.js';
import type { PullRequestRow } from './GithubPullRequests.js';
import type { LiveFolder } from './LiveFolderStore.js';

export const MANUAL_URL = 'https://github.com/valsar6/VivArcDi/blob/main/docs/manual/live-folders.md';
export const CONNECT_TITLE = 'Connect GitHub';
export const TOKEN_COMMAND = 'vivarcdi live-folders token';

const CONNECT_ROW_ID = 'connect';
const ROW_DEPTH = 1;

export class LiveEntries {
  /**
   * Turns a stored live folder into the folder the section draws: its rows, or, when no token is
   * stored, the single `Connect GitHub` row that says which command to run.
   *
   * @param folder A stored live folder.
   * @returns The folder entry, marked live, with the warning of the last failed refresh.
   */
  public static folder(folder: LiveFolder): FolderEntry {
    const children = folder.needsToken ? LiveEntries.#connect(folder.id) : folder.rows.flatMap((row) => LiveEntries.#row(folder.id, row));
    return {
      kind: 'folder',
      id: LinkId.folder(folder.id),
      title: folder.name,
      depth: 0,
      children,
      live: true,
      ...(folder.warning === null ? {} : { warning: folder.warning }),
    };
  }

  static #row(folderId: string, row: PullRequestRow): LinkEntry[] {
    const key = AddressKey.from(row.url);
    return key === null ? [] : [{ kind: 'link', id: LinkId.row(folderId, row.id), title: row.title, url: row.url, key, depth: ROW_DEPTH, subtitle: row.subtitle }];
  }

  static #connect(folderId: string): LinkEntry[] {
    return LiveEntries.#row(folderId, { id: CONNECT_ROW_ID, title: CONNECT_TITLE, url: MANUAL_URL, subtitle: TOKEN_COMMAND, updatedAt: '' });
  }
}
