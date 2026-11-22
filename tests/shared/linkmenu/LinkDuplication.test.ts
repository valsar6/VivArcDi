import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BookmarkNode } from '../../../src/core/browser/bookmarks/BookmarkNode.js';
import { BookmarkCopier } from '../../../src/shared/linkmenu/BookmarkCopier.js';
import type { ToastKind } from '../../../src/core/dom/Toast.js';
import { LinkDuplication } from '../../../src/shared/linkmenu/LinkDuplication.js';
import type { LinkExtras } from '../../../src/shared/linkmenu/LinkExtras.js';
import { silentLogger } from '../../modules/reopen/fakes.js';
import { FolderTabs, WritableChrome, folder, link } from '../../modules/folders/fakes.js';

const tree = (): BookmarkNode[] => [folder('0', '', [folder('1', 'Bar', [link('9', 'First', 'https://first.example/'), link('10', 'Site', 'https://site.example/'), link('14', 'Last', 'https://last.example/')])])];

function setup(): {
  chrome: WritableChrome;
  tabs: FolderTabs;
  hooked: Array<[string, string]>;
  toasts: Array<[string, ToastKind | undefined]>;
  duplication: LinkDuplication;
} {
  const chrome = new WritableChrome(tree());
  const tabs = new FolderTabs([{ id: 1, active: true }]);
  const hooked: Array<[string, string]> = [];
  const toasts: Array<[string, ToastKind | undefined]> = [];
  const writer = chrome.writer;
  const extras: Pick<LinkExtras, 'copy'> = { copy: async (from, to): Promise<void> => void hooked.push([from, to]) };
  const duplication = new LinkDuplication({
    writer,
    copier: new BookmarkCopier(writer),
    extras,
    notify: (text, kind): void => void toasts.push([text, kind]),
    logger: silentLogger(),
  });
  return { chrome, tabs, hooked, toasts, duplication };
}

const barOf = (chrome: WritableChrome): BookmarkNode[] => chrome.tree[0]?.children?.[0]?.children ?? [];

test('duplicates a saved tab right below it', async () => {
  const { chrome, toasts, duplication } = setup();
  await duplication.duplicate('10');
  const bar = barOf(chrome);
  assert.deepEqual(bar.map((node) => node.title), ['First', 'Site', 'Site', 'Last']);
  assert.equal(bar[1]?.id, '10');
  assert.notEqual(bar[2]?.id, '10');
  assert.equal(bar[2]?.url, 'https://site.example/');
  assert.deepEqual(toasts, []);
});

test('leaves the copy of a saved tab without a tab', async () => {
  const { tabs, duplication } = setup();
  await duplication.duplicate('10');
  assert.deepEqual(tabs.calls, []);
  assert.deepEqual([...tabs.tabs.keys()], [1]);
});

test('calls the extras hook with the original and the copy', async () => {
  const { chrome, hooked, duplication } = setup();
  await duplication.duplicate('10');
  assert.deepEqual(hooked, [['10', barOf(chrome)[2]?.id]]);
});

test('shows the error toast and leaves no copy when duplicating a saved tab fails', async () => {
  const { chrome, toasts, hooked, duplication } = setup();
  chrome.failing.add('create');
  await duplication.duplicate('10');
  assert.deepEqual(barOf(chrome).map((node) => node.id), ['9', '10', '14']);
  assert.deepEqual(toasts, [['Could not duplicate "Site"', 'error']]);
  assert.deepEqual(hooked, []);
});
