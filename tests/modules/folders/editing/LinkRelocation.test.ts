import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BookmarkNode } from '../../../../src/core/browser/bookmarks/BookmarkNode.js';
import type { CommandItem, MenuItem } from '../../../../src/core/dom/ContextMenu.js';
import { TabDataWriter } from '../../../../src/core/tabs/TabDataWriter.js';
import type { ToastKind } from '../../../../src/core/dom/Toast.js';
import type { WorkspaceListing } from '../../../../src/core/workspaces/WorkspaceNames.js';
import type { MenuResult } from '../../../../src/shared/spaces/MenuCommand.js';
import { ClosingLinks } from '../../../../src/modules/folders/editing/ClosingLinks.js';
import { LinkRelocation } from '../../../../src/modules/folders/editing/LinkRelocation.js';
import { LinkedTab } from '../../../../src/modules/folders/editing/LinkedTab.js';
import type { PromptOptions } from '../../../../src/modules/folders/editing/PromptDialog.js';
import { WorkspaceRoots } from '../../../../src/modules/folders/tree/WorkspaceRoots.js';
import { silentLogger } from '../../reopen/fakes.js';
import { FolderTabs, WritableChrome, folder, link } from '../fakes.js';

const linkedTo = (workspaceId: number, bookmarkId: string): string => JSON.stringify({ workspaceId, vivarcdi: { bookmarkId } });

const tree = (): BookmarkNode[] => [
  folder('0', '', [
    folder('1', 'Bar', [
      folder('2', 'VivArcDi', [folder('20', 'Casa', [link('11', 'A', 'https://a.example/'), link('14', 'C', 'https://c.example/')]), folder('21', 'Lavoro', [link('30', 'Old', 'https://old.example/')])]),
    ]),
  ]),
];

const workspaces: WorkspaceListing[] = [
  { id: '7', name: 'Casa', icon: null, iconId: null },
  { id: '8', name: 'Lavoro', icon: null, iconId: null },
];

interface Shown {
  text: string;
  kind: ToastKind | undefined;
  onClick: (() => void) | undefined;
}

function setup(answer: string | null = null, created: MenuResult = 'done', active = '7', rootOption = ''): {
  chrome: WritableChrome;
  tabs: FolderTabs;
  shown: Shown[];
  switched: number[];
  asked: PromptOptions[];
  created: string[];
  entries: WorkspaceListing[];
  closing: ClosingLinks;
  seen: string[];
  removed: number[];
  relocation: LinkRelocation;
} {
  const chrome = new WritableChrome(tree());
  const tabs = new FolderTabs([
    { id: 1, active: true, vivExtData: JSON.stringify({ workspaceId: 7 }) },
    { id: 2, vivExtData: linkedTo(7, '11') },
    { id: 3, vivExtData: linkedTo(7, '14') },
  ]);
  const shown: Shown[] = [];
  const switched: number[] = [];
  const asked: PromptOptions[] = [];
  const made: string[] = [];
  const entries = [...workspaces];
  const closing = new ClosingLinks();
  const seen: string[] = [];
  const removed: number[] = [];
  const writer = chrome.writer;
  const relocation = new LinkRelocation({
    writer: {
      subTree: (id): Promise<BookmarkNode> => writer.subTree(id),
      ensurePath: (path): Promise<string> => writer.ensurePath(path),
      move: async (id, destination): Promise<BookmarkNode> => {
        seen.push(`held while moving: ${closing.has(id)}`);
        return writer.move(id, destination);
      },
    },
    linkedTab: new LinkedTab(tabs),
    tabData: TabDataWriter.of(tabs),
    names: {
      entries,
      names: entries.map((entry) => entry.name),
      idOf: (name): string | null => entries.find((entry) => entry.name === name)?.id ?? null,
    },
    active: { current: active },
    roots: new WorkspaceRoots({ root: rootOption, workspaces: {}, workspacesBase: 'VivArcDi' }),
    hold: closing,
    creator: {
      create: async (name): Promise<MenuResult> => {
        made.push(name);
        if (created === 'done') {
          entries.push({ id: '9', name, icon: null, iconId: null });
        }
        return created;
      },
    },
    switcher: { to: async (tabId): Promise<void> => void switched.push(tabId) },
    dialog: {
      ask: async (options): Promise<string | null> => {
        asked.push(options);
        return answer;
      },
    },
    toast: { show: (text, kind, onClick): void => void shown.push({ text, kind, onClick }), remove: (): void => void removed.push(1) },
    logger: silentLogger(),
  });
  return { chrome, tabs, shown, switched, asked, created: made, entries, closing, seen, removed, relocation };
}

const workspaceOf = (tabs: FolderTabs, id: number): unknown => (JSON.parse(tabs.tabs.get(id)?.vivExtData ?? '{}') as { workspaceId?: unknown }).workspaceId;

const childIds = (node: BookmarkNode | undefined): string[] => (node?.children ?? []).map((child) => child.id);

const workspaceFolders = (chrome: WritableChrome): BookmarkNode[] => chrome.tree[0]?.children?.[0]?.children?.[0]?.children ?? [];

const commandsOf = (items: MenuItem[] | undefined): CommandItem[] => (items ?? []).flatMap((item) => ('run' in item ? [item] : []));

test('moves a saved tab to another workspace', async () => {
  const { chrome, tabs, shown, closing, seen, relocation } = setup();
  await relocation.move('11', workspaces[1] as WorkspaceListing);
  assert.deepEqual(childIds(workspaceFolders(chrome)[1]), ['30', '11']);
  assert.deepEqual(childIds(workspaceFolders(chrome)[0]), ['14']);
  assert.equal(workspaceOf(tabs, 2), 8);
  assert.deepEqual(seen, ['held while moving: true']);
  assert.equal(closing.has('11'), false);
  assert.deepEqual(shown.map(({ text, kind }) => [text, kind]), [['Tab moved! Click to go there.', 'ok']]);
});

test('moves only the tab of the row', async () => {
  const { tabs, relocation } = setup();
  tabs.tabs.set(5, { id: 5, windowId: 1, vivExtData: linkedTo(7, '11'), lastAccessed: 1 });
  tabs.tabs.set(2, { id: 2, windowId: 1, vivExtData: linkedTo(7, '11'), lastAccessed: 9 });
  await relocation.move('11', workspaces[1] as WorkspaceListing);
  assert.deepEqual([1, 2, 3, 5].map((id) => workspaceOf(tabs, id)), [7, 8, 7, 7]);
});

test('checks the current workspace in move to of a saved tab', () => {
  const { chrome, shown, relocation } = setup(null, 'done', '8');
  const menu = relocation.submenu('11');
  assert.equal(menu?.label, 'Move to');
  const commands = commandsOf(menu?.items);
  assert.deepEqual(commands.map((item) => [item.label, item.checked]), [['Casa', false], ['Lavoro', true], ['New Space…', undefined]]);
  assert.deepEqual(menu?.items.map((item) => 'separator' in item), [false, false, true, false]);
  commands[1]?.run();
  assert.deepEqual(chrome.calls, []);
  assert.deepEqual(shown, []);
});

test('lists no move to when Vivaldi lists no workspace', () => {
  const { entries, relocation } = setup();
  entries.length = 0;
  assert.equal(relocation.submenu('11'), null);
});

test('switches to the workspace from the move toast', async () => {
  const { switched, shown, relocation } = setup();
  await relocation.move('11', workspaces[1] as WorkspaceListing);
  assert.deepEqual(switched, []);
  shown[0]?.onClick?.();
  assert.deepEqual(switched, [2]);
});

test('says the saved tab is already there when both workspaces share a root', async () => {
  const { chrome, tabs, shown, relocation } = setup(null, 'done', '7', 'VivArcDi/Casa');
  await relocation.move('11', workspaces[1] as WorkspaceListing);
  assert.deepEqual(chrome.calls.filter((call) => call.startsWith('move')), []);
  assert.deepEqual(tabs.calls, []);
  assert.deepEqual(shown.map(({ text, kind }) => [text, kind]), [['"A" is already there', undefined]]);
});

test('keeps the saved tab where it was when the write fails', async () => {
  const { chrome, tabs, shown, closing, relocation } = setup();
  chrome.failing.add('move');
  await relocation.move('11', workspaces[1] as WorkspaceListing);
  assert.deepEqual(tabs.calls, []);
  assert.equal(workspaceOf(tabs, 2), 7);
  assert.deepEqual(shown.map(({ text, kind, onClick }) => [text, kind, onClick]), [['Could not move "A"', 'error', undefined]]);
  assert.equal(closing.has('11'), false);
});

test('moves a saved tab to a new space', async () => {
  const { chrome, tabs, created, asked, shown, relocation } = setup('Riposo');
  const commands = commandsOf(relocation.submenu('11')?.items);
  (commands[2] as CommandItem).run();
  await new Promise((resolve) => setImmediate(resolve));
  const asking = asked[0] as PromptOptions;
  const validate = asking.validate as (value: string) => string | null;
  assert.equal(asking.title, 'New Space');
  assert.equal(validate(''), 'Enter a name');
  assert.equal(validate('Casa'), 'A space with that name already exists');
  assert.equal(validate('Riposo'), null);
  assert.deepEqual(created, ['Riposo']);
  assert.equal(workspaceOf(tabs, 2), 9);
  assert.deepEqual(childIds(workspaceFolders(chrome)[0]), ['14']);
  assert.deepEqual(shown.map(({ text }) => text), ['Tab moved! Click to go there.']);
});

test('creates no space when the name is empty or the dialog is cancelled', async () => {
  for (const answer of ['', null]) {
    const { chrome, created, shown, relocation } = setup(answer);
    await relocation.moveToNewSpace('11');
    assert.deepEqual(created, []);
    assert.deepEqual(chrome.calls.filter((call) => call.startsWith('move')), []);
    assert.deepEqual(shown, []);
  }
});

test('moves nothing and says so when the new space cannot be created', async () => {
  for (const result of ['failed', 'deferred'] as const) {
    const { chrome, shown, relocation } = setup('Riposo', result);
    await relocation.moveToNewSpace('11');
    assert.deepEqual(chrome.calls.filter((call) => call.startsWith('move')), []);
    assert.deepEqual(shown.map(({ text, kind }) => [text, kind]), [['Could not create the space', 'error']]);
  }
});

test('says where a saved tab went when it has no open tab', async () => {
  const { chrome, shown, relocation } = setup(null, 'done', '8');
  await relocation.move('30', workspaces[0] as WorkspaceListing);
  assert.deepEqual(childIds(workspaceFolders(chrome)[0]), ['11', '14', '30']);
  assert.deepEqual(shown.map(({ text, onClick }) => [text, onClick]), [['Moved "Old" to Casa', undefined]]);
});

test('removes the toast when the relocation is disposed', () => {
  const { removed, relocation } = setup();
  relocation.dispose();
  assert.deepEqual(removed, [1]);
});
