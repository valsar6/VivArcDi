import { AddressKey } from "../../core/AddressKey.js";
import { BookmarkFolderFinder } from "../../core/bookmarks/BookmarkFolderFinder.js";
import { SyncNames } from "./SyncNames.js";
const PINNED = "Pinned";
const SETTINGS = "Settings";
const SETTINGS_URL = "https://vivarcdi.invalid/settings";
class SyncStore {
  #reader;
  #writer;
  #folder;
  /**
   * The bookmark folder that carries VivArcDi's data through Vivaldi Sync: one subfolder for each
   * workspace name, holding the folder `Pinned` with one bookmark for each pinned tab and the
   * bookmark `Settings` with a JSON text in its description. Reading never creates anything.
   *
   * @param reader Read-only bookmarks.
   * @param writer The only way to change bookmarks.
   * @param folder The title of the sync folder.
   */
  constructor(reader, writer, folder) {
    this.#reader = reader;
    this.#writer = writer;
    this.#folder = folder;
  }
  /**
   * @returns What the store holds for each workspace, by subfolder title; empty when the store does not exist yet.
   */
  async spaces() {
    const root = BookmarkFolderFinder.find(await this.#reader.getTree(), [this.#folder]);
    const spaces = /* @__PURE__ */ new Map();
    for (const node of root?.children ?? []) {
      const space = SyncStore.#spaceOf(node);
      if (space !== null) {
        spaces.set(node.title, space);
      }
    }
    return spaces;
  }
  /**
   * Makes the pinned tabs of a workspace in the store equal to a list, touching only what differs:
   * missing bookmarks are added at their place, others are removed or renamed, and the whole list
   * is rebuilt only when the order differs.
   *
   * @param workspaceName The workspace name, or null for the area outside any workspace.
   * @param entries The pinned tabs to keep, in order.
   */
  async writePinned(workspaceName, entries) {
    const parentId = await this.#writer.ensurePath([this.#folder, SyncNames.folderOf(workspaceName), PINNED]);
    let kept = await this.#dropUnwanted(parentId, entries);
    if (!SyncStore.#sameOrder(kept, entries)) {
      await Promise.all(kept.map((node) => this.#remove(node)));
      kept = [];
    }
    for (const [index, entry] of entries.entries()) {
      const existing = kept.find((node) => AddressKey.from(node.url) === entry.key);
      if (existing === void 0) {
        await this.#writer.create({ parentId, index, title: entry.title, url: entry.url });
      } else if (existing.title !== entry.title) {
        await this.#writer.update(existing.id, entry.title);
      }
    }
  }
  /**
   * @param workspaceName The workspace name, or null for the area outside any workspace.
   * @param text The text to keep in the description of the `Settings` bookmark.
   */
  async writeSettings(workspaceName, text) {
    const parentId = await this.#writer.ensurePath([this.#folder, SyncNames.folderOf(workspaceName)]);
    const existing = (await this.#writer.children(parentId)).find((node) => node.title === SETTINGS && node.url !== void 0);
    const id = existing?.id ?? (await this.#writer.create({ parentId, title: SETTINGS, url: SETTINGS_URL })).id;
    await this.#writer.describe(id, text);
  }
  /**
   * Gives the folder of a workspace its new name, unless there is no such folder or the new name is taken.
   *
   * @param from The old name of the workspace.
   * @param to The new name.
   */
  async renameSpace(from, to) {
    const tree = await this.#reader.getTree();
    const old = BookmarkFolderFinder.find(tree, [this.#folder, from]);
    if (old !== null && BookmarkFolderFinder.find(tree, [this.#folder, to]) === null) {
      await this.#writer.update(old.id, to);
    }
  }
  static #spaceOf(node) {
    const children = node.children ?? [];
    const pinned = children.find((child) => child.title === PINNED && child.children !== void 0);
    const settings = children.find((child) => child.title === SETTINGS && child.url !== void 0);
    return pinned === void 0 && settings === void 0 ? null : SyncStore.#space(pinned, settings);
  }
  static #space(pinned, settings) {
    return { pinned: SyncStore.#entriesOf(pinned?.children ?? []), settings: settings?.description ?? null };
  }
  static #entriesOf(nodes) {
    const entries = /* @__PURE__ */ new Map();
    for (const { title, url } of nodes) {
      const key = AddressKey.from(url);
      if (key !== null && url !== void 0 && !entries.has(key)) {
        entries.set(key, { key, title, url });
      }
    }
    return [...entries.values()];
  }
  static #sameOrder(kept, entries) {
    const keys = kept.map((node) => AddressKey.from(node.url));
    const wanted = entries.map(({ key }) => key).filter((key) => keys.includes(key));
    return keys.every((key, position) => key === wanted[position]);
  }
  async #dropUnwanted(parentId, entries) {
    const wanted = new Set(entries.map(({ key }) => key));
    const seen = /* @__PURE__ */ new Set();
    const kept = [];
    for (const node of await this.#writer.children(parentId)) {
      const key = AddressKey.from(node.url);
      if (key !== null && wanted.has(key) && !seen.has(key)) {
        seen.add(key);
        kept.push(node);
      } else {
        await this.#remove(node);
      }
    }
    return kept;
  }
  #remove(node) {
    return node.children === void 0 ? this.#writer.remove(node.id) : this.#writer.removeTree(node.id);
  }
}
export {
  SyncStore
};
