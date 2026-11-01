import type { BookmarksApi, BookmarksHost } from '../../../src/core/bookmarks/BrowserBookmarks.js';
import { BookmarkWriter } from '../../../src/core/bookmarks/BookmarkWriter.js';
import type { WritableBookmarksApi, WriterHost } from '../../../src/core/bookmarks/BookmarkWriter.js';
import { BrowserBookmarks } from '../../../src/core/bookmarks/BrowserBookmarks.js';
import type { BookmarkNode } from '../../../src/core/bookmarks/BookmarkNode.js';
import type { TabActivatedListener, TabCreatedListener, TabRemovedListener, TabUpdateListener } from '../../../src/core/BrowserTabs.js';
import type { FrameTiming } from '../../../src/core/FrameTask.js';

export const folder = (id: string, title: string, children: BookmarkNode[] = []): BookmarkNode => ({ id, title, children });

export const link = (id: string, title: string, url: string): BookmarkNode => ({ id, title, url });

/** The tree of Tore's bookmarks, reduced: the folder to show sits under two outer folders. */
export function bookmarkTree(root: BookmarkNode[]): BookmarkNode[] {
  return [folder('0', '', [folder('1', 'Barra dei preferiti', [folder('2', 'Importati da Firefox', [folder('3', 'Bookmarks Bar', root)])])])];
}

export const ROOT_PATH = ['Importati da Firefox', 'Bookmarks Bar'];

/** Runs frame tasks as soon as they are requested, in a microtask. */
export const immediateFrames: FrameTiming = {
  schedule: (run) => void queueMicrotask(run),
  cancel: () => undefined,
};

export class FakeBookmarks {
  public tree: BookmarkNode[];
  public listeners = new Set<() => void>();
  public available = true;

  constructor(tree: BookmarkNode[]) {
    this.tree = tree;
  }

  public async getTree(): Promise<BookmarkNode[]> {
    return this.tree;
  }

  public onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public change(tree: BookmarkNode[]): void {
    this.tree = tree;
    this.listeners.forEach((listener) => listener());
  }
}

/** A `chrome` object with `chrome.bookmarks` that records every call, to prove nothing is written. */
export function recordingChrome(tree: BookmarkNode[]): { host: BookmarksHost; calls: string[]; bookmarks: BrowserBookmarks } {
  const calls: string[] = [];
  const event = { addListener: (): void => void calls.push('addListener'), removeListener: (): void => void calls.push('removeListener') };
  const api = {
    getTree: (callback: (tree: BookmarkNode[]) => void): void => {
      calls.push('getTree');
      callback(tree);
    },
    onCreated: event,
    onRemoved: event,
    onChanged: event,
    onMoved: event,
    create: (): void => void calls.push('create'),
    update: (): void => void calls.push('update'),
    move: (): void => void calls.push('move'),
    remove: (): void => void calls.push('remove'),
    removeTree: (): void => void calls.push('removeTree'),
  };
  const host: BookmarksHost = { bookmarks: api };
  return { host, calls, bookmarks: new BrowserBookmarks(host) };
}

export type FolderTab = Partial<chrome.tabs.Tab> & { id: number; vivExtData?: string };

export class FolderTabs {
  public available = true;
  public tabs = new Map<number, FolderTab>();
  public calls: Array<[string, ...unknown[]]> = [];
  public nextId = 100;
  public failing = new Set<string>();
  public created = new Set<TabCreatedListener>();
  public updated = new Set<TabUpdateListener>();
  public activated = new Set<TabActivatedListener>();
  public removed = new Set<TabRemovedListener>();

  constructor(tabs: FolderTab[] = []) {
    tabs.forEach((tab) => this.tabs.set(tab.id, { windowId: 1, ...tab }));
  }

  public async query(info: Record<string, unknown>): Promise<chrome.tabs.Tab[]> {
    const rest = Object.fromEntries(Object.entries(info).filter(([key]) => key !== 'currentWindow'));
    return [...this.tabs.values()].filter((tab) =>
      Object.entries(rest).every(([key, value]) => (tab as Record<string, unknown>)[key] === value),
    ) as chrome.tabs.Tab[];
  }

  public async get(tabId: number): Promise<chrome.tabs.Tab> {
    return { ...this.tabs.get(tabId) } as chrome.tabs.Tab;
  }

  public async remove(tabId: number): Promise<void> {
    this.calls.push(['remove', tabId]);
    this.close(tabId);
  }

  public async activate(tabId: number): Promise<chrome.tabs.Tab> {
    this.calls.push(['activate', tabId]);
    return { ...this.tabs.get(tabId) } as chrome.tabs.Tab;
  }

  public async reload(tabId: number): Promise<void> {
    this.calls.push(['reload', tabId]);
  }

  public async create(properties: chrome.tabs.CreateProperties): Promise<chrome.tabs.Tab> {
    this.calls.push(['create', properties]);
    const tab: FolderTab = { id: this.nextId++, windowId: 1, url: properties.url };
    this.tabs.set(tab.id, tab);
    return { ...tab } as chrome.tabs.Tab;
  }

  public async update(tabId: number, properties: Record<string, unknown>): Promise<chrome.tabs.Tab> {
    this.calls.push(['update', tabId, properties]);
    if (this.failing.has('update')) {
      throw new Error('update failed');
    }
    const tab = this.tabs.get(tabId);
    if (tab !== undefined) {
      this.tabs.set(tabId, { ...tab, ...properties });
    }
    return { ...this.tabs.get(tabId) } as chrome.tabs.Tab;
  }

  public onCreated(listener: TabCreatedListener): () => void {
    this.created.add(listener);
    return () => this.created.delete(listener);
  }

  public onUpdated(listener: TabUpdateListener): () => void {
    this.updated.add(listener);
    return () => this.updated.delete(listener);
  }

  public onActivated(listener: TabActivatedListener): () => void {
    this.activated.add(listener);
    return () => this.activated.delete(listener);
  }

  public onRemoved(listener: TabRemovedListener): () => void {
    this.removed.add(listener);
    return () => this.removed.delete(listener);
  }

  public open(tab: FolderTab): void {
    this.tabs.set(tab.id, { windowId: 1, ...tab });
    this.created.forEach((listener) => listener({ ...tab } as chrome.tabs.Tab));
  }

  public navigate(tabId: number, url: string): void {
    const tab = { ...this.tabs.get(tabId), url } as FolderTab;
    this.tabs.set(tabId, tab);
    this.updated.forEach((listener) => listener(tabId, { url }, tab as chrome.tabs.Tab));
  }

  public close(tabId: number): void {
    this.tabs.delete(tabId);
    this.removed.forEach((listener) => listener(tabId));
  }

  public listenerCount(): number {
    return this.created.size + this.updated.size + this.activated.size + this.removed.size;
  }

  public actions(): Array<[string, ...unknown[]]> {
    return this.calls;
  }
}

const findNode = (nodes: BookmarkNode[], id: string): BookmarkNode | undefined => {
  for (const node of nodes) {
    const found = node.id === id ? node : findNode(node.children ?? [], id);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
};

/** A `chrome.bookmarks` with an in-memory tree that creates, renames and removes, and records the calls. */
export class WritableChrome implements WriterHost {
  public tree: BookmarkNode[];
  public calls: string[] = [];
  public failing = new Set<string>();
  public runtime: { lastError?: { message?: string } | undefined } = {};
  public bookmarks: WritableBookmarksApi & Required<Pick<BookmarksApi, 'onCreated' | 'onRemoved' | 'onChanged' | 'onMoved'>>;
  public listeners = new Set<() => void>();
  #nextId = 500;

  constructor(tree: BookmarkNode[]) {
    this.tree = tree;
    const event = {
      addListener: (listener: () => void): void => void this.listeners.add(listener),
      removeListener: (listener: () => void): void => void this.listeners.delete(listener),
    };
    this.bookmarks = {
      onCreated: event,
      onRemoved: event,
      onChanged: event,
      onMoved: event,
      getTree: (callback): void => this.#answer('getTree', () => callback(this.tree)),
      getChildren: (id, callback): void => this.#answer('getChildren', () => callback(findNode(this.tree, id)?.children ?? [])),
      create: (details, callback): void =>
        this.#answer(`create ${details.title}`, () => {
          const parent = findNode(this.tree, details.parentId ?? '2') ?? findNode(this.tree, '1');
          const node: BookmarkNode = { id: String(this.#nextId++), title: details.title, url: details.url, children: details.url === undefined ? [] : undefined };
          const children = parent?.children ?? [];
          children.splice(details.index ?? children.length, 0, node);
          callback(node);
        }),
      update: (id, changes, callback): void =>
        this.#answer(`update ${id}`, () => {
          const node = findNode(this.tree, id);
          if (node !== undefined) {
            node.title = changes.title;
            callback(node);
          }
        }),
      remove: (id, callback): void =>
        this.#answer(`remove ${id}`, () => {
          const parent = this.#parentOf(this.tree, id);
          if (parent?.children !== undefined) {
            parent.children = parent.children.filter((child) => child.id !== id);
          }
          callback();
        }),
    };
  }

  public get writer(): BookmarkWriter {
    return new BookmarkWriter(this);
  }

  public get reader(): BrowserBookmarks {
    return new BrowserBookmarks(this);
  }

  public get created(): string[] {
    return this.calls.filter((call) => call.startsWith('create ')).map((call) => call.slice('create '.length));
  }

  #parentOf(nodes: BookmarkNode[], id: string): BookmarkNode | undefined {
    for (const node of nodes) {
      if (node.children?.some((child) => child.id === id) === true) {
        return node;
      }
      const found = this.#parentOf(node.children ?? [], id);
      if (found !== undefined) {
        return found;
      }
    }
    return undefined;
  }

  #answer(call: string, run: () => void): void {
    this.calls.push(call);
    this.runtime.lastError = this.failing.has(call.split(' ')[0] ?? '') ? { message: `${call} failed` } : undefined;
    run();
    this.runtime.lastError = undefined;
    if (!call.startsWith('get')) {
      this.listeners.forEach((listener) => listener());
    }
  }
}
