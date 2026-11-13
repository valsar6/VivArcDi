import { AddressKey } from '../../core/tabs/AddressKey.js';
import type { BookmarkNode } from '../../core/browser/bookmarks/BookmarkNode.js';
import { BookmarkFolderFinder } from '../../core/browser/bookmarks/BookmarkFolderFinder.js';
import type { BookmarkWriter } from '../../core/browser/bookmarks/BookmarkWriter.js';
import type { BrowserBookmarks } from '../../core/browser/bookmarks/BrowserBookmarks.js';
import { SyncNames } from './SyncNames.js';

export interface PinnedEntry {
  /** The address key of the own page, as `AddressKey` builds it. */
  key: string;
  title: string;
  /** The own page of the pinned tab. */
  url: string;
}

export interface StoredSpace {
  /** The pinned tabs of the workspace, in the order of the store. */
  pinned: PinnedEntry[];
  /** The text of the `Settings` bookmark, or null when the workspace has none. */
  settings: string | null;
}

export type StoreReader = Pick<BrowserBookmarks, 'getTree'>;

export type StoreWriter = Pick<BookmarkWriter, 'ensurePath' | 'children' | 'create' | 'update' | 'remove' | 'removeTree' | 'describe'>;

const PINNED = 'Pinned';
const SETTINGS = 'Settings';
const SETTINGS_URL = 'https://vivarcdi.invalid/settings';

export class SyncStore {
  #reader: StoreReader;
  #writer: StoreWriter;
  #folder: string;

  /**
   * The bookmark folder that carries VivArcDi's data through Vivaldi Sync: one subfolder for each
   * workspace name, holding the folder `Pinned` with one bookmark for each pinned tab and the
   * bookmark `Settings` with a JSON text in its description. Reading never creates anything.
   *
   * @param reader Read-only bookmarks.
   * @param writer The only way to change bookmarks.
   * @param folder The title of the sync folder.
   */
  constructor(reader: StoreReader, writer: StoreWriter, folder: string) {
    this.#reader = reader;
    this.#writer = writer;
    this.#folder = folder;
  }

  /**
   * @returns What the store holds for each workspace, by subfolder title; empty when the store does not exist yet.
   */
  public async spaces(): Promise<Map<string, StoredSpace>> {
    const root = BookmarkFolderFinder.find(await this.#reader.getTree(), [this.#folder]);
    const spaces = new Map<string, StoredSpace>();
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
  public async writePinned(workspaceName: string | null, entries: PinnedEntry[]): Promise<void> {
    const parentId = await this.#writer.ensurePath([this.#folder, SyncNames.folderOf(workspaceName), PINNED]);
    let kept = await this.#dropUnwanted(parentId, entries);
    if (!SyncStore.#sameOrder(kept, entries)) {
      await Promise.all(kept.map((node) => this.#remove(node)));
      kept = [];
    }
    for (const [index, entry] of entries.entries()) {
      const existing = kept.find((node) => AddressKey.from(node.url) === entry.key);
      if (existing === undefined) {
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
  public async writeSettings(workspaceName: string | null, text: string): Promise<void> {
    const parentId = await this.#writer.ensurePath([this.#folder, SyncNames.folderOf(workspaceName)]);
    const existing = (await this.#writer.children(parentId)).find((node) => node.title === SETTINGS && node.url !== undefined);
    const id = existing?.id ?? (await this.#writer.create({ parentId, title: SETTINGS, url: SETTINGS_URL })).id;
    await this.#writer.describe(id, text);
  }

  /**
   * Gives the folder of a workspace its new name, unless there is no such folder or the new name is taken.
   *
   * @param from The old name of the workspace.
   * @param to The new name.
   */
  public async renameSpace(from: string, to: string): Promise<void> {
    const tree = await this.#reader.getTree();
    const old = BookmarkFolderFinder.find(tree, [this.#folder, from]);
    if (old !== null && BookmarkFolderFinder.find(tree, [this.#folder, to]) === null) {
      await this.#writer.update(old.id, to);
    }
  }

  static #spaceOf(node: BookmarkNode): StoredSpace | null {
    const children = node.children ?? [];
    const pinned = children.find((child) => child.title === PINNED && child.children !== undefined);
    const settings = children.find((child) => child.title === SETTINGS && child.url !== undefined);
    return pinned === undefined && settings === undefined ? null : SyncStore.#space(pinned, settings);
  }

  static #space(pinned: BookmarkNode | undefined, settings: BookmarkNode | undefined): StoredSpace {
    return { pinned: SyncStore.#entriesOf(pinned?.children ?? []), settings: settings?.description ?? null };
  }

  static #entriesOf(nodes: BookmarkNode[]): PinnedEntry[] {
    const entries = new Map<string, PinnedEntry>();
    for (const { title, url } of nodes) {
      const key = AddressKey.from(url);
      if (key !== null && url !== undefined && !entries.has(key)) {
        entries.set(key, { key, title, url });
      }
    }
    return [...entries.values()];
  }

  static #sameOrder(kept: BookmarkNode[], entries: PinnedEntry[]): boolean {
    const keys = kept.map((node) => AddressKey.from(node.url));
    const wanted = entries.map(({ key }) => key).filter((key) => keys.includes(key));
    return keys.every((key, position) => key === wanted[position]);
  }

  async #dropUnwanted(parentId: string, entries: PinnedEntry[]): Promise<BookmarkNode[]> {
    const wanted = new Set(entries.map(({ key }) => key));
    const seen = new Set<string | null>();
    const kept: BookmarkNode[] = [];
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

  #remove(node: BookmarkNode): Promise<void> {
    return node.children === undefined ? this.#writer.remove(node.id) : this.#writer.removeTree(node.id);
  }
}
