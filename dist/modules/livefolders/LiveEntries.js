import { AddressKey } from "../../core/AddressKey.js";
import { LinkId } from "../../core/LinkId.js";
const MANUAL_URL = "https://github.com/valsar6/VivArcDi/blob/main/docs/manual/live-folders.md";
const CONNECT_TITLE = "Connect GitHub";
const RECONNECT_TITLE = "Reconnect GitHub";
const NOT_SET_UP_TITLE = "GitHub is not set up in this VivArcDi";
const CONNECT_ROW_ID = "connect";
const ROW_DEPTH = 1;
class LiveEntries {
  /**
   * Turns a stored live folder into the folder the section draws: its rows; the single
   * `Connect GitHub` row when GitHub is not connected; the single `GitHub is not set up in this
   * VivArcDi` row when the client id is missing; and a `Reconnect GitHub` row first when GitHub
   * refused the connection.
   *
   * @param folder A stored live folder.
   * @param state Whether GitHub can be connected and is.
   * @returns The folder entry, marked live, with the warning of the last failed refresh.
   */
  static folder(folder, state) {
    return {
      kind: "folder",
      id: LinkId.folder(folder.id),
      title: folder.name,
      depth: 0,
      children: LiveEntries.#children(folder, state),
      live: true,
      ...folder.warning === null || !state.connected ? {} : { warning: folder.warning }
    };
  }
  static #children(folder, { configured, connected }) {
    if (!configured) {
      return LiveEntries.#action(folder.id, NOT_SET_UP_TITLE);
    }
    if (!connected) {
      return LiveEntries.#action(folder.id, CONNECT_TITLE);
    }
    const rows = folder.rows.flatMap((row) => LiveEntries.#row(folder.id, row));
    return folder.needsReconnect ? [...LiveEntries.#action(folder.id, RECONNECT_TITLE), ...rows] : rows;
  }
  static #row(folderId, row) {
    const key = AddressKey.from(row.url);
    return key === null ? [] : [{ kind: "link", id: LinkId.row(folderId, row.id), title: row.title, url: row.url, key, depth: ROW_DEPTH, subtitle: row.subtitle }];
  }
  static #action(folderId, title) {
    const key = AddressKey.from(MANUAL_URL);
    return key === null ? [] : [{ kind: "link", id: LinkId.row(folderId, CONNECT_ROW_ID), title, url: MANUAL_URL, key, depth: ROW_DEPTH }];
  }
}
export {
  CONNECT_ROW_ID,
  CONNECT_TITLE,
  LiveEntries,
  MANUAL_URL,
  NOT_SET_UP_TITLE,
  RECONNECT_TITLE
};
