import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BookmarkNode } from '../../../../src/core/browser/bookmarks/BookmarkNode.js';
import { BookmarkCopier } from '../../../../src/modules/folders/editing/BookmarkCopier.js';
import type { ToastKind } from '../../../../src/core/dom/Toast.js';
import { FolderDuplication } from '../../../../src/modules/folders/editing/FolderDuplication.js';
import { silentLogger } from '../../reopen/fakes.js';
import { WritableChrome, folder, link } from '../fakes.js';

const tree = (): BookmarkNode[] => [
  folder('0', '', [folder('1', 'Bar', [folder('9', 'First'), folder('10', 'Hobbies', [link('11', 'A', 'https://a.example/'), folder('12', 'Deep', [link('13', 'B', 'https://b.example/')])]), link('14', 'C', 'https://c.example/')])]),
];

function setup(): { chrome: WritableChrome; toasts: Array<[string, ToastKind | undefined]>; duplication: FolderDuplication } {
  const chrome = new WritableChrome(tree());
  const toasts: Array<[string, ToastKind | undefined]> = [];
  const writer = chrome.writer;
  const duplication = new FolderDuplication({ writer, copier: new BookmarkCopier(writer), notify: (text, kind): void => void toasts.push([text, kind]), logger: silentLogger() });
  return { chrome, toasts, duplication };
}

const titles = (nodes: BookmarkNode[] | undefined): string[] => (nodes ?? []).map((node) => node.title);

const barOf = (chrome: WritableChrome): BookmarkNode[] => chrome.tree[0]?.children?.[0]?.children ?? [];

test('duplicates a folder right below it', async () => {
  const { chrome, toasts, duplication } = setup();
  await duplication.duplicate('10');
  const bar = barOf(chrome);
  const copy = bar[2] as BookmarkNode;
  assert.deepEqual(titles(bar), ['First', 'Hobbies', 'Hobbies', 'C']);
  assert.equal(bar[1]?.id, '10');
  assert.notEqual(copy.id, '10');
  assert.deepEqual(titles(copy.children), ['A', 'Deep']);
  assert.deepEqual(titles(copy.children?.[1]?.children), ['B']);
  assert.deepEqual(toasts, []);
});

test('keeps the original when duplicating a folder fails', async () => {
  const { chrome, toasts, duplication } = setup();
  chrome.failing.add('create');
  await duplication.duplicate('10');
  assert.deepEqual(barOf(chrome).map((child) => child.id), ['9', '10', '14']);
  assert.deepEqual(toasts, [['Could not duplicate "Hobbies"', 'error']]);
});
