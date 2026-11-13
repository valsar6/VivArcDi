import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BookmarkNode } from '../../../../src/core/browser/bookmarks/BookmarkNode.js';
import { TabDataWriter } from '../../../../src/core/tabs/TabDataWriter.js';
import type { ToastKind } from '../../../../src/core/dom/Toast.js';
import type { WorkspaceListing } from '../../../../src/core/workspaces/WorkspaceNames.js';
import { ClosingLinks } from '../../../../src/modules/folders/editing/ClosingLinks.js';
import { FolderLinkTabs } from '../../../../src/modules/folders/editing/FolderLinkTabs.js';
import { FolderRelocation } from '../../../../src/modules/folders/editing/FolderRelocation.js';
import { OpenFolders } from '../../../../src/modules/folders/tree/OpenFolders.js';
import { WorkspaceRoots } from '../../../../src/modules/folders/tree/WorkspaceRoots.js';
import { MemoryStorage, silentLogger } from '../../reopen/fakes.js';
import { FolderTabs, WritableChrome, folder, link } from '../fakes.js';

const linkedTo = (workspaceId: number, bookmarkId: string): string => JSON.stringify({ workspaceId, vivarcdi: { bookmarkId } });

const tree = (): BookmarkNode[] => [
  folder('0', '', [
    folder('1', 'Bar', [
      folder('2', 'VivArcDi', [
        folder('20', 'Casa', [folder('10', 'Hobbies', [link('11', 'A', 'https://a.example/'), folder('12', 'Deep', [link('13', 'B', 'https://b.example/')])]), link('14', 'C', 'https://c.example/')]),
        folder('21', 'Lavoro', [folder('30', 'Old')]),
      ]),
    ]),
  ]),
];

const workspaces: WorkspaceListing[] = [
  { id: '7', name: 'Casa', icon: null, iconId: null },
  { id: '8', name: 'Lavoro', icon: null, iconId: null },
];

function setup(active: string | null = '7', entries = workspaces, rootOption = ''): {
  chrome: WritableChrome;
  tabs: FolderTabs;
  toasts: Array<[string, ToastKind | undefined]>;
  closing: ClosingLinks;
  open: OpenFolders;
  seen: string[];
  relocation: FolderRelocation;
} {
  const chrome = new WritableChrome(tree());
  const tabs = new FolderTabs([
    { id: 1, vivExtData: linkedTo(7, '11') },
    { id: 2, vivExtData: linkedTo(7, '13') },
    { id: 3, vivExtData: linkedTo(7, '14') },
  ]);
  const toasts: Array<[string, ToastKind | undefined]> = [];
  const closing = new ClosingLinks();
  const seen: string[] = [];
  const open = new OpenFolders(new MemoryStorage(), silentLogger());
  open.useWorkspace(null);
  open.toggle('10');
  const writer = chrome.writer;
  const relocation = new FolderRelocation({
    writer: {
      subTree: (id): Promise<BookmarkNode> => writer.subTree(id),
      ensurePath: (path): Promise<string> => writer.ensurePath(path),
      move: async (id, destination): Promise<BookmarkNode> => {
        seen.push(`closing while held: ${closing.has('11')}`);
        return writer.move(id, destination);
      },
    },
    linkTabs: new FolderLinkTabs({ tabs: { query: (info): Promise<chrome.tabs.Tab[]> => tabs.query({ ...info }) } }),
    tabData: TabDataWriter.of(tabs),
    names: { entries },
    active: { current: active },
    roots: new WorkspaceRoots({ root: rootOption, workspaces: undefined }, silentLogger()),
    openFolders: open,
    closing,
    notify: (text, kind): void => void toasts.push([text, kind]),
    logger: silentLogger(),
  });
  return { chrome, tabs, toasts, closing, open, seen, relocation };
}

const workspaceOf = (tabs: FolderTabs, id: number): unknown => (JSON.parse(tabs.tabs.get(id)?.vivExtData ?? '{}') as { workspaceId?: unknown }).workspaceId;

const ownOf = (tabs: FolderTabs, id: number): unknown => (JSON.parse(tabs.tabs.get(id)?.vivExtData ?? '{}') as { vivarcdi?: unknown }).vivarcdi;

const childIds = (node: BookmarkNode | undefined): string[] => (node?.children ?? []).map((child) => child.id);

const workspaceFolders = (chrome: WritableChrome): BookmarkNode[] => chrome.tree[0]?.children?.[0]?.children?.[0]?.children ?? [];

test('moves a folder and its tabs to another workspace', async () => {
  const { chrome, tabs, toasts, closing, open, seen, relocation } = setup();
  await relocation.move('10', workspaces[1] as WorkspaceListing);
  assert.deepEqual(childIds(workspaceFolders(chrome)[1]), ['30', '10']);
  assert.deepEqual(childIds(workspaceFolders(chrome)[0]), ['14']);
  assert.deepEqual([1, 2, 3].map((id) => workspaceOf(tabs, id)), [8, 8, 7]);
  assert.deepEqual(ownOf(tabs, 1), { bookmarkId: '11' });
  assert.deepEqual(seen, ['closing while held: true']);
  assert.equal(closing.has('11'), false);
  assert.equal(open.has('10'), false);
  assert.deepEqual(toasts, [['Moved "Hobbies" to Lavoro', undefined]]);
});

test('checks the current workspace in move to', () => {
  const { relocation, chrome, toasts } = setup('8');
  const menu = relocation.submenu('10');
  assert.equal(menu?.label, 'Move to');
  const items = (menu?.items ?? []).flatMap((item) => ('run' in item ? [item] : []));
  assert.deepEqual(items.map((item) => [item.label, item.checked]), [['Casa', false], ['Lavoro', true]]);
  items[1]?.run();
  assert.deepEqual(chrome.calls, []);
  assert.deepEqual(toasts, []);
  assert.equal(setup('8', []).relocation.submenu('10'), null);
});

test('says the folder is already there when both workspaces share a root', async () => {
  const { chrome, tabs, toasts, relocation } = setup('7', workspaces, 'VivArcDi/Casa');
  await relocation.move('10', workspaces[1] as WorkspaceListing);
  assert.deepEqual(chrome.calls.filter((call) => call.startsWith('move')), []);
  assert.deepEqual(tabs.calls, []);
  assert.deepEqual(toasts, [['"Hobbies" is already there', undefined]]);
});

test('keeps the folder and its tabs when a folder action fails', async () => {
  const { chrome, tabs, toasts, closing, open, relocation } = setup();
  chrome.failing.add('move');
  await relocation.move('10', workspaces[1] as WorkspaceListing);
  assert.deepEqual(tabs.calls, []);
  assert.deepEqual([1, 2, 3].map((id) => workspaceOf(tabs, id)), [7, 7, 7]);
  assert.deepEqual(toasts, [['Could not move "Hobbies"', 'error']]);
  assert.equal(closing.has('11'), false);
  assert.equal(open.has('10'), true);
});

test('moves the other tabs when one tab fails', async () => {
  const { tabs, toasts, relocation } = setup();
  const update = tabs.update.bind(tabs);
  tabs.update = async (tabId, properties): Promise<chrome.tabs.Tab> => {
    if (tabId === 1) {
      throw new Error('update failed');
    }
    return update(tabId, properties);
  };
  await relocation.move('10', workspaces[1] as WorkspaceListing);
  assert.deepEqual([1, 2].map((id) => workspaceOf(tabs, id)), [7, 8]);
  assert.deepEqual(toasts, [['Moved "Hobbies" to Lavoro', undefined]]);
});
