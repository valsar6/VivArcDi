import type { BookmarkNode } from '../../../src/core/browser/bookmarks/BookmarkNode.js';
import type { TabMovedListener } from '../../../src/core/browser/BrowserTabs.js';
import { Logger } from '../../../src/core/support/Logger.js';
import type { LogSink } from '../../../src/core/support/Logger.js';
import { WorkspaceTabs } from '../../../src/core/workspaces/WorkspaceTabs.js';
import { LocalPinned } from '../../../src/modules/workspacesync/LocalPinned.js';
import type { MenuResult } from '../../../src/modules/workspacesync/MenuCommand.js';
import { MissingSpaces } from '../../../src/modules/workspacesync/MissingSpaces.js';
import { PinnedApplier } from '../../../src/modules/workspacesync/PinnedApplier.js';
import { SpaceBase } from '../../../src/modules/workspacesync/SpaceBase.js';
import type { SpaceEntry } from '../../../src/modules/workspacesync/SpaceEntry.js';
import { SpaceIds } from '../../../src/modules/workspacesync/SpaceIds.js';
import { SpaceList } from '../../../src/modules/workspacesync/SpaceList.js';
import { SpaceSync } from '../../../src/modules/workspacesync/SpaceSync.js';
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
  public icons: Record<string, string> = {};

  constructor(workspaces: Record<string, string>) {
    this.workspaces = workspaces;
  }

  public get names(): string[] {
    return Object.values(this.workspaces);
  }

  public get entries(): Array<{ id: string; name: string; icon: string | null; iconId: number | null }> {
    return Object.entries(this.workspaces).map(([id, name]) => ({ id, name, icon: this.icons[id] ?? null, iconId: null }));
  }

  public async refresh(): Promise<void> {}

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

export const SPACE_URL = 'https://vivarcdi.invalid/space/';

export const spaceFolder = (entries: SpaceEntry[]): BookmarkNode =>
  folder(
    '60',
    'Spaces',
    entries.map(({ syncId, name, icon, iconId }, index) => ({ ...link(`61${index}`, name, `${SPACE_URL}${syncId}`), description: JSON.stringify({ icon, iconId }) })),
  );

export const storeTree = (spaces: Record<string, string[]>, list: SpaceEntry[] = []): BookmarkNode[] => [
  folder('20', FOLDER, [
    ...Object.entries(spaces).map(([space, names], position) =>
      folder(`3${position}`, space, [folder(`4${position}`, 'Pinned', names.map((name, index) => link(`5${position}${index}`, name, page(name))))]),
    ),
    ...(list.length > 0 ? [spaceFolder(list)] : []),
  ]),
];

export const listIn = (chrome: WritableChrome): SpaceEntry[] => {
  const find = (nodes: BookmarkNode[]): BookmarkNode | undefined => nodes.flatMap((node) => (node.title === 'Spaces' && node.children !== undefined ? [node] : (find(node.children ?? []) ?? []))).at(0);
  return (find(chrome.tree)?.children ?? []).map((node) => ({
    syncId: (node.url ?? '').slice(SPACE_URL.length),
    name: node.title,
    ...(JSON.parse(node.description ?? '{}') as { icon: string | null; iconId: number | null }),
  }));
};

export class FakeCreator {
  public calls: string[] = [];
  public result: MenuResult = 'done';
  #names: FakeNames;
  #next = 900;

  constructor(names: FakeNames) {
    this.#names = names;
  }

  public async create(name: string): Promise<MenuResult> {
    this.calls.push(name);
    if (this.result === 'done') {
      this.#names.workspaces = { ...this.#names.workspaces, [String(this.#next++)]: name };
    }
    return this.result;
  }
}

export class FakeRenamer {
  public calls: Array<[string, string]> = [];
  public succeeds = true;
  #names: FakeNames;

  constructor(names: FakeNames) {
    this.#names = names;
  }

  public async rename(from: string, to: string): Promise<boolean> {
    this.calls.push([from, to]);
    if (this.succeeds) {
      this.#names.workspaces = Object.fromEntries(Object.entries(this.#names.workspaces).map(([id, name]) => [id, name === from ? to : name]));
    }
    return this.succeeds;
  }
}

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
  creator: FakeCreator;
  renamer: FakeRenamer;
  ids: SpaceIds;
  spaceBase: SpaceBase;
  retries: number[];
  base: SyncBase;
  store: SyncStore;
  pass: SyncPass;
}

const syncedList = (workspaces: Record<string, string>): SpaceEntry[] =>
  Object.entries(workspaces).map(([id, name]): SpaceEntry => ({ syncId: `s-${id}`, name, icon: null, iconId: null }));

const treeOf = (store: Record<string, string[]>, list: SpaceEntry[]): BookmarkNode[] => [...bookmarkTree([]), ...(Object.keys(store).length > 0 || list.length > 0 ? storeTree(store, list) : [])];

const seedSpaces = (storage: MemoryStorage, workspaces: Record<string, string>, agreed: SpaceEntry[] | null | undefined, links: Record<string, string> | undefined): { spaceBase: SpaceBase; ids: SpaceIds } => {
  const spaceBase = new SpaceBase(storage);
  const known = agreed === undefined ? syncedList(workspaces) : agreed;
  if (known !== null) {
    spaceBase.set(known);
  }
  let counter = 0;
  const ids = new SpaceIds(storage, () => `new-${++counter}`);
  Object.entries(links ?? Object.fromEntries(Object.keys(workspaces).map((id) => [id, `s-${id}`]))).forEach(([vivaldiId, syncId]) => ids.link(vivaldiId, syncId));
  return { spaceBase, ids };
};

export function world({
  tabs = [],
  store = {},
  base = {},
  workspaces = { '7': 'Casetta' },
  windowId = 1,
  ownerId = 1,
  spaces,
  spaceBase: agreed,
  links,
}: {
  spaces?: SpaceEntry[];
  spaceBase?: SpaceEntry[] | null;
  links?: Record<string, string>;
  tabs?: FolderTab[];
  store?: Record<string, string[]>;
  base?: Record<string, string[]>;
  workspaces?: Record<string, string>;
  windowId?: number;
  ownerId?: number;
}): World {
  const chrome = new WritableChrome(treeOf(store, spaces ?? syncedList(workspaces)));
  const fakeTabs = new PinningTabs(tabs);
  const names = new FakeNames(workspaces);
  const storage = new MemoryStorage();
  const { spaceBase, ids } = seedSpaces(storage, workspaces, agreed, links);
  const creator = new FakeCreator(names);
  const renamer = new FakeRenamer(names);
  const retries: number[] = [];
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
    spaces: new SpaceSync({
      names,
      ids,
      list: new SpaceList(chrome.reader, chrome.writer, FOLDER),
      base: spaceBase,
      pinnedBase: syncBase,
      store: syncStore,
      creator,
      renamer,
      missing: new MissingSpaces(storage, (text) => announced.push(text)),
      retry: (): void => void retries.push(retries.length),
      logger,
    }),
    logger,
  });
  return { chrome, tabs: fakeTabs, names, storage, sink, announced, creator, renamer, ids, spaceBase, retries, base: syncBase, store: syncStore, pass };
}
