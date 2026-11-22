import type { BookmarkNode } from '../../core/browser/bookmarks/BookmarkNode.js';
import type { BrowserBookmarks } from '../../core/browser/bookmarks/BrowserBookmarks.js';
import type { BrowserTabs } from '../../core/browser/BrowserTabs.js';
import { LabelKeys } from '../../core/browser/LinkLabels.js';
import type { LabelEvent, LinkLabels } from '../../core/browser/LinkLabels.js';
import type { Logger } from '../../core/support/Logger.js';
import { TabData } from '../../core/tabs/TabData.js';
import type { WorkspaceNames } from '../../core/workspaces/WorkspaceNames.js';
import { SyncNames } from './SyncNames.js';
import type { WorkspaceSettings } from './WorkspaceSettings.js';

export interface LabelSyncParts {
  labels: Pick<LinkLabels, 'all' | 'get' | 'set' | 'onChange'>;
  settings: Pick<WorkspaceSettings, 'all' | 'set'>;
  bookmarks: Pick<BrowserBookmarks, 'getTree'>;
  tabs: Pick<BrowserTabs, 'query'>;
  names: Pick<WorkspaceNames, 'names' | 'nameOf'>;
  /** The titles of the base folder of the workspaces and of the Favorites folder. */
  folders: { base: string[]; favorites: string[] };
  logger: Logger;
}

interface Place {
  area: string | null;
  entry: string;
}

const BOOKMARK_PREFIX = 'bookmark:';
const PAGE_PREFIX = 'page:';
const UUID_ENTRY = 'name:uuid:';
const PAGE_ENTRY = 'name:page:';

export class LabelSync {
  #parts: LabelSyncParts;
  #known = new Map<string, string | undefined>();
  #later = new Set<string>();
  #queue: Promise<void> = Promise.resolve();
  #stopListening: (() => void) | null = null;
  #warned = false;

  /**
   * Carries the custom names of saved rows and tiles through Vivaldi Sync, in the workspace settings
   * of 030: `name:uuid:<uuid>` for a link from a bookmark and `name:page:<address key>` for a tile
   * made from a pinned tab, with the name as the value and null for a removed name. Only names
   * travel; icons and favicons stay on this computer. A name applied from the store is not written back.
   *
   * @param parts The labels, the settings and what places a link in a workspace.
   */
  constructor(parts: LabelSyncParts) {
    this.#parts = parts;
  }

  /**
   * Remembers the names as they are and writes the next changes to the store.
   */
  public start(): void {
    this.#known = new Map([...this.#parts.labels.all()].map(([key, label]) => [key, label.name]));
    this.#stopListening = this.#parts.labels.onChange((event) => this.#changed(event));
  }

  /**
   * Stops listening to the labels.
   */
  public stop(): void {
    this.#stopListening?.();
    this.#stopListening = null;
  }

  /**
   * @returns A promise that settles when the names written so far reached the store; never rejects.
   */
  public settled(): Promise<void> {
    return this.#queue;
  }

  /**
   * Run after a sync pass: tries again the names that had to wait, then gives each label the name
   * the store holds for its link. Never throws.
   */
  public async apply(): Promise<void> {
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

  #changed({ key, fromSync }: LabelEvent): void {
    const name = this.#parts.labels.get(key)?.name;
    const changed = this.#known.get(key) !== name;
    this.#known.set(key, name);
    if (!fromSync && changed) {
      this.#queue = this.#queue.then(() => this.#write(key));
    }
  }

  async #write(key: string): Promise<void> {
    try {
      const place = await this.#place(key, await this.#parts.bookmarks.getTree());
      if (place === 'later') {
        this.#later.add(key);
      } else if (place !== null) {
        this.#later.delete(key);
        await this.#parts.settings.set(place.area, place.entry, this.#parts.labels.get(key)?.name ?? null);
      }
    } catch (error) {
      this.#warn(error);
    }
  }

  async #retry(): Promise<void> {
    for (const key of [...this.#later]) {
      await this.#write(key);
    }
  }

  async #place(key: string, tree: BookmarkNode[]): Promise<Place | 'later' | null> {
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
    if (area === undefined) {
      return null;
    }
    return found.node.uuid === undefined ? 'later' : { area, entry: `${UUID_ENTRY}${found.node.uuid}` };
  }

  async #pagePlace(key: string): Promise<Place | null> {
    const pinned = await this.#parts.tabs.query({ pinned: true, currentWindow: true });
    const tab = pinned.find((candidate) => LabelKeys.page(candidate) === key);
    if (tab === undefined) {
      return null;
    }
    const workspaceId = TabData.of(tab);
    const area = this.#parts.names.nameOf(workspaceId);
    return workspaceId !== null && area === null ? null : { area, entry: `${PAGE_ENTRY}${key.slice(PAGE_PREFIX.length)}` };
  }

  #areaOf(path: string[]): string | null | undefined {
    const { base, favorites } = this.#parts.folders;
    if (favorites.length > 0 && LabelSync.#endsWith(path, favorites)) {
      return null;
    }
    const start = base.length === 0 ? -1 : path.findIndex((_title, index) => LabelSync.#startsWith(path.slice(index), base));
    if (start < 0) {
      return undefined;
    }
    const inside = path[start + base.length];
    return inside !== undefined && this.#parts.names.names.includes(inside) ? inside : null;
  }

  #areas(): Array<string | null> {
    return [null, ...new Set(this.#parts.names.names.filter((name) => !SyncNames.reserved(name)))];
  }

  async #applyArea(area: string | null, settings: Record<string, unknown>, tree: BookmarkNode[]): Promise<void> {
    for (const [entry, value] of Object.entries(settings)) {
      const key = LabelSync.#keyOf(entry, area, tree, this.#areaOf.bind(this));
      if (key !== null && (value === null || (typeof value === 'string' && value !== ''))) {
        await this.#applyName(key, value);
      }
    }
  }

  async #applyName(key: string, name: string | null): Promise<void> {
    if (this.#parts.labels.get(key)?.name !== (name ?? undefined)) {
      await this.#parts.labels.set(key, { name }, { fromSync: true });
    }
  }

  #warn(error: unknown): void {
    if (!this.#warned) {
      this.#warned = true;
      this.#parts.logger.warn('the names of saved tabs cannot be synced', error);
    }
  }

  static #keyOf(entry: string, area: string | null, tree: BookmarkNode[], areaOf: (path: string[]) => string | null | undefined): string | null {
    if (entry.startsWith(PAGE_ENTRY)) {
      return `${PAGE_PREFIX}${entry.slice(PAGE_ENTRY.length)}`;
    }
    if (!entry.startsWith(UUID_ENTRY)) {
      return null;
    }
    const found = LabelSync.#locate(tree, [], undefined, entry.slice(UUID_ENTRY.length));
    return found !== null && areaOf(found.path) === area ? LabelKeys.bookmark(found.node.id) : null;
  }

  static #locate(nodes: BookmarkNode[], path: string[], id?: string, uuid?: string): { node: BookmarkNode; path: string[] } | null {
    for (const node of nodes) {
      if ((id !== undefined && node.id === id) || (uuid !== undefined && node.uuid === uuid)) {
        return { node, path };
      }
      const inside = node.children === undefined ? null : LabelSync.#locate(node.children, [...path, node.title], id, uuid);
      if (inside !== null) {
        return inside;
      }
    }
    return null;
  }

  static #startsWith(path: string[], head: string[]): boolean {
    return head.every((title, index) => path[index] === title);
  }

  static #endsWith(path: string[], tail: string[]): boolean {
    return path.length >= tail.length && LabelSync.#startsWith(path.slice(path.length - tail.length), tail);
  }
}
