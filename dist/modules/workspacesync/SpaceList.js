import { BookmarkFolderFinder } from "../../core/browser/bookmarks/BookmarkFolderFinder.js";
const SPACES = "Spaces";
const URL_PREFIX = "https://vivarcdi.invalid/space/";
class SpaceList {
  #reader;
  #writer;
  #folder;
  /**
   * The list of workspaces in the sync store: the folder `Spaces` of the sync folder, with one
   * bookmark for each workspace in Vivaldi's order. The title is the name, the address ends with
   * the sync id and the description holds the icon as JSON. Reading never creates anything.
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
   * @returns The workspaces of the store, in order; empty when the list does not exist yet.
   */
  async read() {
    const folder = BookmarkFolderFinder.find(await this.#reader.getTree(), [this.#folder, SPACES]);
    return (folder?.children ?? []).flatMap((node) => SpaceList.#entryOf(node) ?? []);
  }
  /**
   * Makes the list in the store equal to the given one, touching only what differs.
   *
   * @param entries The workspaces to keep, in order.
   */
  async write(entries) {
    const parentId = await this.#writer.ensurePath([this.#folder, SPACES]);
    let kept = await this.#dropUnwanted(parentId, entries);
    if (!SpaceList.#sameOrder(kept, entries)) {
      await Promise.all(kept.map((node) => this.#writer.remove(node.id)));
      kept = [];
    }
    for (const [index, entry] of entries.entries()) {
      const existing = kept.find((node) => SpaceList.#idOf(node) === entry.syncId);
      if (existing === void 0) {
        const node = await this.#writer.create({ parentId, index, title: entry.name, url: `${URL_PREFIX}${entry.syncId}` });
        await this.#writer.describe(node.id, SpaceList.#describe(entry));
      } else {
        await this.#refresh(existing, entry);
      }
    }
  }
  async #refresh(node, entry) {
    if (node.title !== entry.name) {
      await this.#writer.update(node.id, entry.name);
    }
    if (node.description !== SpaceList.#describe(entry)) {
      await this.#writer.describe(node.id, SpaceList.#describe(entry));
    }
  }
  async #dropUnwanted(parentId, entries) {
    const wanted = new Set(entries.map(({ syncId }) => syncId));
    const seen = /* @__PURE__ */ new Set();
    const kept = [];
    for (const node of await this.#writer.children(parentId)) {
      const id = SpaceList.#idOf(node);
      if (id !== null && wanted.has(id) && !seen.has(id)) {
        seen.add(id);
        kept.push(node);
      } else {
        await (node.children === void 0 ? this.#writer.remove(node.id) : this.#writer.removeTree(node.id));
      }
    }
    return kept;
  }
  static #sameOrder(kept, entries) {
    const ids = kept.map((node) => SpaceList.#idOf(node));
    const wanted = entries.map(({ syncId }) => syncId).filter((id) => ids.includes(id));
    return ids.every((id, position) => id === wanted[position]);
  }
  static #idOf(node) {
    return node.url?.startsWith(URL_PREFIX) === true ? node.url.slice(URL_PREFIX.length) : null;
  }
  static #describe({ icon, iconId }) {
    return JSON.stringify({ icon, iconId });
  }
  static #entryOf(node) {
    const syncId = SpaceList.#idOf(node);
    if (syncId === null || syncId === "") {
      return null;
    }
    const { icon, iconId } = SpaceList.#parse(node.description);
    return { syncId, name: node.title, icon: typeof icon === "string" ? icon : null, iconId: typeof iconId === "number" ? iconId : null };
  }
  static #parse(description) {
    try {
      const parsed = JSON.parse(description ?? "{}");
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }
}
export {
  SpaceList
};
