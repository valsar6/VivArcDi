import type { BookmarkNode } from '../../../src/core/bookmarks/BookmarkNode.js';
import type { TabMovedListener } from '../../../src/core/BrowserTabs.js';
import { Logger } from '../../../src/core/Logger.js';
import type { LogSink } from '../../../src/core/Logger.js';
import { WorkspaceTabs } from '../../../src/core/WorkspaceTabs.js';
import { LocalPinned } from '../../../src/modules/workspacesync/LocalPinned.js';
import { MissingSpaces } from '../../../src/modules/workspacesync/MissingSpaces.js';
import { PinnedApplier } from '../../../src/modules/workspacesync/PinnedApplier.js';
import { SyncBase } from '../../../src/modules/workspacesync/SyncBase.js';
import { SyncPass } from '../../../src/modules/workspacesync/SyncPass.js';
import { SyncStore } from '../../../src/modules/workspacesync/SyncStore.js';
import { LinkingTabs, own } from '../favorites/linked.js';
import { WritableChrome, bookmarkTree, folder, link } from '../folders/fakes.js';
import type { FolderTab } from '../folders/fakes.js';
import { MemoryStorage } from '../reopen/fakes.js';

export const FOLDER = 'VivArcDi Sync';

export const page = (name: string): string => `https://${name}.example/`;

export class CountingSink implements LogSink {
  public warnings: unknown[][] = [];

  public info(): void {}

  public warn(...message: unknown[]): void {
    this.warnings.push(message);
  }

  public error(): void {}
}

export class FakeNames {
  public workspaces: Record<string, string>;

  constructor(workspaces: Record<string, string>) {
    this.workspaces = workspaces;
  }

  public get names(): string[] {
    return Object.values(this.workspaces);
  }

  public nameOf(id: string | null): string | null {
    return id === null ? null : (this.workspaces[id] ?? null);
  }

  public idOf(name: string): string | null {
    return Object.entries(this.workspaces).find(([, candidate]) => candidate === name)?.[0] ?? null;
  }
}

/** Pinned tabs of one window in a known order, which honor `create` and `move`. */
export class PinningTabs extends LinkingTabs {
  public order: number[];
  public moved = new Set<TabMovedListener>();

  constructor(tabs: FolderTab[] = []) {
    super(tabs);
    this.order = tabs.map(({ id }) => id);
  }

  public override async create(properties: chrome.tabs.CreateProperties): Promise<chrome.tabs.Tab> {
    const created = await super.create(properties);
    const id = created.id as number;
    this.tabs.set(id, { ...(this.tabs.get(id) as FolderTab), pinned: properties.pinned === true, active: properties.active === true, windowId: properties.windowId ?? 1 });
    this.order.push(id);
    return { ...this.tabs.get(id) } as chrome.tabs.Tab;
  }

  public override close(tabId: number): void {
    this.order = this.order.filter((id) => id !== tabId);
    super.close(tabId);
  }

  public override async query(info: Record<string, unknown>): Promise<chrome.tabs.Tab[]> {
    const found = await super.query(info);
    return found.map((tab) => ({ ...tab, index: this.order.indexOf(tab.id ?? -1) }));
  }

  public async move(tabId: number, properties: chrome.tabs.MoveProperties): Promise<chrome.tabs.Tab> {
    this.calls.push(['move', tabId, properties.index]);
    this.order = this.order.filter((id) => id !== tabId);
    this.order.splice(properties.index, 0, tabId);
    return { ...this.tabs.get(tabId) } as chrome.tabs.Tab;
  }

  public onMoved(listener: TabMovedListener): () => void {
    this.moved.add(listener);
    return () => this.moved.delete(listener);
  }

  public override listenerCount(): number {
    return super.listenerCount() + this.moved.size;
  }

  public tabCalls(): Array<[string, ...unknown[]]> {
    return this.calls;
  }
}

export const pinnedTab = (id: number, name: string, extra: Partial<FolderTab> = {}): FolderTab => ({
  id,
  pinned: true,
  active: false,
  url: page(name),
  title: name,
  vivExtData: own({ workspaceId: 7 }, undefined, page(name)),
  ...extra,
});

export const storeTree = (spaces: Record<string, string[]>): BookmarkNode[] => [
  folder(
    '20',
    FOLDER,
    Object.entries(spaces).map(([space, names], position) =>
      folder(`3${position}`, space, [folder(`4${position}`, 'Pinned', names.map((name, index) => link(`5${position}${index}`, name, page(name))))]),
    ),
  ),
];

export const pinnedIn = (chrome: WritableChrome, space: string): string[] => {
  const find = (nodes: BookmarkNode[], title: string): BookmarkNode | undefined => nodes.flatMap((node) => (node.title === title && node.children !== undefined ? [node] : (find(node.children ?? [], title) ?? []))).at(0);
  const root = find(chrome.tree, FOLDER);
  const pinned = find(root?.children?.filter((child) => child.title === space) ?? [], 'Pinned');
  return pinned?.children?.map((child) => child.title) ?? [];
};

export interface World {
  chrome: WritableChrome;
  tabs: PinningTabs;
  names: FakeNames;
  storage: MemoryStorage;
  sink: CountingSink;
  announced: string[];
  base: SyncBase;
  store: SyncStore;
  pass: SyncPass;
}

export function world({
  tabs = [],
  store = {},
  base = {},
  workspaces = { '7': 'Casetta' },
  windowId = 1,
  ownerId = 1,
}: {
  tabs?: FolderTab[];
  store?: Record<string, string[]>;
  base?: Record<string, string[]>;
  workspaces?: Record<string, string>;
  windowId?: number;
  ownerId?: number;
}): World {
  const chrome = new WritableChrome([...bookmarkTree([]), ...(Object.keys(store).length > 0 ? storeTree(store) : [])]);
  const fakeTabs = new PinningTabs(tabs);
  const names = new FakeNames(workspaces);
  const storage = new MemoryStorage();
  const sink = new CountingSink();
  const logger = new Logger('test', sink);
  const syncBase = new SyncBase(storage);
  Object.entries(base).forEach(([space, keys]) => syncBase.set(space === 'Tabs' ? null : space, keys.map((name) => `${name}.example`)));
  const announced: string[] = [];
  const local = new LocalPinned(fakeTabs, names, logger);
  const syncStore = new SyncStore(chrome.reader, chrome.writer, FOLDER);
  const pass = new SyncPass({
    owner: { ownId: async (): Promise<number | null> => (ownerId === windowId ? windowId : null) },
    names,
    store: syncStore,
    base: syncBase,
    local,
    applier: new PinnedApplier(fakeTabs, new WorkspaceTabs(fakeTabs, logger), local, names),
    missing: new MissingSpaces(storage, (text) => announced.push(text)),
    logger,
  });
  return { chrome, tabs: fakeTabs, names, storage, sink, announced, base: syncBase, store: syncStore, pass };
}
