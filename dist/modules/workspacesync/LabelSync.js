import { LabelKeys } from "../../core/browser/LinkLabels.js";
import { TabData } from "../../core/tabs/TabData.js";
import { SyncNames } from "./SyncNames.js";
const BOOKMARK_PREFIX = "bookmark:";
const PAGE_PREFIX = "page:";
const UUID_ENTRY = "name:uuid:";
const PAGE_ENTRY = "name:page:";
class LabelSync {
  #parts;
  #known = /* @__PURE__ */ new Map();
  #later = /* @__PURE__ */ new Set();
  #queue = Promise.resolve();
  #stopListening = null;
  #warned = false;
  /**
   * Carries the custom names of saved rows and tiles through Vivaldi Sync, in the workspace settings
   * of 030: `name:uuid:<uuid>` for a link from a bookmark and `name:page:<address key>` for a tile
   * made from a pinned tab, with the name as the value and null for a removed name. Only names
   * travel; icons and favicons stay on this computer. A name applied from the store is not written back.
   *
   * @param parts The labels, the settings and what places a link in a workspace.
   */
  constructor(parts) {
    this.#parts = parts;
  }
  /**
   * Remembers the names as they are and writes the next changes to the store.
   */
  start() {
    this.#known = new Map([...this.#parts.labels.all()].map(([key, label]) => [key, label.name]));
    this.#stopListening = this.#parts.labels.onChange((event) => this.#changed(event));
  }
  /**
   * Stops listening to the labels.
   */
  stop() {
    this.#stopListening?.();
    this.#stopListening = null;
  }
  /**
   * @returns A promise that settles when the names written so far reached the store; never rejects.
   */
  settled() {
    return this.#queue;
  }
  /**
   * Run after a sync pass: tries again the names that had to wait, then gives each label the name
   * the store holds for its link. Never throws.
   */
  async apply() {
    await this.#queue;
    try {
      await this.#retry();
      const tree = await this.#parts.bookmarks.getTree();
      for (const area of this.#areas()) {
        await this.#applyArea(area, await this.#parts.settings.all(area), tree);
      }
    } catch (error) {
      this.#warn(error);
    }
  }
  #changed({ key, fromSync }) {
    const name = this.#parts.labels.get(key)?.name;
    const changed = this.#known.get(key) !== name;
    this.#known.set(key, name);
    if (!fromSync && changed) {
      this.#queue = this.#queue.then(() => this.#write(key));
    }
  }
  async #write(key) {
    try {
      const place = await this.#place(key, await this.#parts.bookmarks.getTree());
      if (place === "later") {
        this.#later.add(key);
      } else if (place !== null) {
        this.#later.delete(key);
        await this.#parts.settings.set(place.area, place.entry, this.#parts.labels.get(key)?.name ?? null);
      }
    } catch (error) {
      this.#warn(error);
    }
  }
  async #retry() {
    for (const key of [...this.#later]) {
      await this.#write(key);
    }
  }
  async #place(key, tree) {
    if (key.startsWith(PAGE_PREFIX)) {
      return this.#pagePlace(key);
    }
    if (!key.startsWith(BOOKMARK_PREFIX)) {
      return null;
    }
    const found = LabelSync.#locate(tree, [], key.slice(BOOKMARK_PREFIX.length));
    if (found === null) {
      return null;
    }
    const area = this.#areaOf(found.path);
    if (area === void 0) {
      return null;
    }
    return found.node.uuid === void 0 ? "later" : { area, entry: `${UUID_ENTRY}${found.node.uuid}` };
  }
  async #pagePlace(key) {
    const pinned = await this.#parts.tabs.query({ pinned: true, currentWindow: true });
    const tab = pinned.find((candidate) => LabelKeys.page(candidate) === key);
    if (tab === void 0) {
      return null;
    }
    const workspaceId = TabData.of(tab);
    const area = this.#parts.names.nameOf(workspaceId);
    return workspaceId !== null && area === null ? null : { area, entry: `${PAGE_ENTRY}${key.slice(PAGE_PREFIX.length)}` };
  }
  #areaOf(path) {
    const { base, favorites } = this.#parts.folders;
    if (favorites.length > 0 && LabelSync.#endsWith(path, favorites)) {
      return null;
    }
    const start = base.length === 0 ? -1 : path.findIndex((_title, index) => LabelSync.#startsWith(path.slice(index), base));
    if (start < 0) {
      return void 0;
    }
    const inside = path[start + base.length];
    return inside !== void 0 && this.#parts.names.names.includes(inside) ? inside : null;
  }
  #areas() {
    return [null, ...new Set(this.#parts.names.names.filter((name) => !SyncNames.reserved(name)))];
  }
  async #applyArea(area, settings, tree) {
    for (const [entry, value] of Object.entries(settings)) {
      const key = LabelSync.#keyOf(entry, area, tree, this.#areaOf.bind(this));
      if (key !== null && (value === null || typeof value === "string" && value !== "")) {
        await this.#applyName(key, value);
      }
    }
  }
  async #applyName(key, name) {
    if (this.#parts.labels.get(key)?.name !== (name ?? void 0)) {
      await this.#parts.labels.set(key, { name }, { fromSync: true });
    }
  }
  #warn(error) {
    if (!this.#warned) {
      this.#warned = true;
      this.#parts.logger.warn("the names of saved tabs cannot be synced", error);
    }
  }
  static #keyOf(entry, area, tree, areaOf) {
    if (entry.startsWith(PAGE_ENTRY)) {
      return `${PAGE_PREFIX}${entry.slice(PAGE_ENTRY.length)}`;
    }
    if (!entry.startsWith(UUID_ENTRY)) {
      return null;
    }
    const found = LabelSync.#locate(tree, [], void 0, entry.slice(UUID_ENTRY.length));
    return found !== null && areaOf(found.path) === area ? LabelKeys.bookmark(found.node.id) : null;
  }
  static #locate(nodes, path, id, uuid) {
    for (const node of nodes) {
      if (id !== void 0 && node.id === id || uuid !== void 0 && node.uuid === uuid) {
        return { node, path };
      }
      const inside = node.children === void 0 ? null : LabelSync.#locate(node.children, [...path, node.title], id, uuid);
      if (inside !== null) {
        return inside;
      }
    }
    return null;
  }
  static #startsWith(path, head) {
    return head.every((title, index) => path[index] === title);
  }
  static #endsWith(path, tail) {
    return path.length >= tail.length && LabelSync.#startsWith(path.slice(path.length - tail.length), tail);
  }
}
export {
  LabelSync
};
