import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BookmarkNode } from '../../../src/core/browser/bookmarks/BookmarkNode.js';
import type { CommandItem, MenuItem, SubmenuItem } from '../../../src/core/dom/ContextMenu.js';
import { LinkedTab } from '../../../src/shared/linkmenu/LinkedTab.js';
import { PinnedAddress } from '../../../src/shared/linkmenu/PinnedAddress.js';
import type { PromptOptions } from '../../../src/shared/linkmenu/PromptDialog.js';
import type { ToastKind } from '../../../src/core/dom/Toast.js';
import { silentLogger } from '../../modules/reopen/fakes.js';
import { FolderTabs, WritableChrome, bookmarkTree, folder, link } from '../../modules/folders/fakes.js';

const SAVED = 'https://a.example/';

interface Setup {
  chrome: WritableChrome;
  address: PinnedAddress;
  asked: PromptOptions[];
  toasts: Array<[string, ToastKind | undefined]>;
  submenu: () => Promise<SubmenuItem>;
  item: (label: string) => Promise<CommandItem>;
}

const tabsWith = (tabUrl?: string): FolderTabs =>
  new FolderTabs([{ id: 1, active: true }, ...(tabUrl === undefined ? [] : [{ id: 2, url: tabUrl, vivExtData: JSON.stringify({ vivarcdi: { bookmarkId: '11' } }) }])]);

function setUp(answer: string | null, tabUrl?: string): Setup {
  const chrome = new WritableChrome(bookmarkTree([folder('10', 'Hobbies', [link('11', 'Mail', SAVED)])]));
  const tabs = tabsWith(tabUrl);
  const asked: PromptOptions[] = [];
  const toasts: Array<[string, ToastKind | undefined]> = [];
  const address = new PinnedAddress({
    writer: chrome.writer,
    linkedTab: new LinkedTab(tabs),
    dialog: {
      ask: async (options: PromptOptions): Promise<string | null> => {
        asked.push(options);
        return answer;
      },
    },
    notify: (text: string, kind?: ToastKind): void => void toasts.push([text, kind]),
    logger: silentLogger(),
  });
  const submenu = async (): Promise<SubmenuItem> => (await address.submenu('11')) as SubmenuItem;
  const item = async (label: string): Promise<CommandItem> => (await submenu()).items.find((entry: MenuItem) => entry.label === label) as CommandItem;
  return { chrome, address, asked, toasts, submenu, item };
}

const nodeOf = (chrome: WritableChrome): BookmarkNode => {
  const find = (nodes: BookmarkNode[]): BookmarkNode | undefined => nodes.flatMap((node) => (node.id === '11' ? [node] : (find(node.children ?? []) ?? []))).at(0);
  return find(chrome.tree) as BookmarkNode;
};
const urlOf = (chrome: WritableChrome): string | undefined => nodeOf(chrome).url;
const settled = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

test('edits the pinned url of a saved tab', async () => {
  const { chrome, item, asked } = setUp('https://b.example/page');
  (await item('Edit…')).run();
  await settled();
  const { title, text, value, confirm } = asked[0] as PromptOptions;
  assert.deepEqual([title, text, value, confirm], ['Edit Pinned URL', 'This is what opens first when you click this tab or its favicon.', SAVED, 'Save']);
  assert.equal(urlOf(chrome), 'https://b.example/page');
  assert.equal(nodeOf(chrome).title, 'Mail');
  assert.deepEqual(chrome.calls.filter((call) => call.startsWith('update')), ['update 11']);
});

test('edits the pinned url of a saved tab only with a valid address', async () => {
  const { item, asked } = setUp(null);
  (await item('Edit…')).run();
  await settled();
  const validate = asked[0]?.validate as (text: string) => string | null;
  for (const good of ['https://b.example/', 'http://b.example', 'file:///tmp/a.html', 'vivaldi://settings']) {
    assert.equal(validate(good), null, good);
  }
  for (const bad of ['', 'not a url', 'b.example', 'javascript:alert(1)', 'ftp://b.example/']) {
    assert.equal(validate(bad), 'Enter a valid address', bad);
  }
});

test('writes nothing when the pinned url dialog is cancelled', async () => {
  const { chrome, item, toasts } = setUp(null);
  (await item('Edit…')).run();
  await settled();
  assert.deepEqual(chrome.calls.filter((call) => call.startsWith('update')), []);
  assert.equal(urlOf(chrome), SAVED);
  assert.deepEqual(toasts, []);
});

test('tells the user when the pinned url cannot be written', async () => {
  const { chrome, item, toasts } = setUp('https://b.example/');
  chrome.failing.add('update');
  (await item('Edit…')).run();
  await settled();
  assert.deepEqual(toasts, [['Could not change the address', 'error']]);
});

test('replaces the pinned url with the current one', async () => {
  const { chrome, item } = setUp(null, 'https://c.example/now');
  (await item('Replace Pinned URL with Current')).run();
  await settled();
  assert.equal(urlOf(chrome), 'https://c.example/now');
  assert.equal(nodeOf(chrome).title, 'Mail');
});

test('disables replace pinned url when equal', async () => {
  const { chrome, item } = setUp(null, 'https://a.example');
  const replace = await item('Replace Pinned URL with Current');
  assert.equal(replace.disabled, true);
  const other = await setUp(null, 'https://c.example/').item('Replace Pinned URL with Current');
  assert.equal(other.disabled, false);
  assert.deepEqual(chrome.calls.filter((call) => call.startsWith('update')), []);
});

test('disables replace pinned url when the row has no open tab', async () => {
  const { item } = setUp(null);
  assert.equal((await item('Replace Pinned URL with Current')).disabled, true);
});

test('lists Edit Pinned Page with its two items', async () => {
  const { submenu } = setUp(null);
  const menu = await submenu();
  assert.equal(menu.label, 'Edit Pinned Page');
  assert.deepEqual(menu.items.map((entry) => entry.label), ['Replace Pinned URL with Current', 'Edit…']);
});
