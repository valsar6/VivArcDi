import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BookmarkCopier } from '../../../../src/modules/folders/editing/BookmarkCopier.js';
import type { BookmarkNode } from '../../../../src/core/browser/bookmarks/BookmarkNode.js';
import type { NewBookmark } from '../../../../src/core/browser/bookmarks/BookmarkWriter.js';
import { WritableChrome, bookmarkTree, folder, link } from '../fakes.js';

const separator = (id: string): BookmarkNode => ({ id, title: '', url: 'https://separator.example/', separator: true });

const MUSIC = folder('20', 'Music', [link('21', 'Radio', 'https://radio.example/'), separator('22'), folder('23', 'Jazz', [link('24', 'Blue', 'https://blue.example/')]), link('25', 'Mix', 'https://mix.example/')]);
const TREE = bookmarkTree([folder('30', 'Panel', [MUSIC, link('31', 'Chess', 'https://chess.com/'), link('32', 'Go', 'https://go.example/')]), folder('40', 'Root', [link('41', 'Old', 'https://old.example/')])]);

const find = (nodes: BookmarkNode[], id: string): BookmarkNode | undefined => nodes.flatMap((node) => (node.id === id ? [node] : find(node.children ?? [], id) ?? [])).at(0);
const shape = (node: BookmarkNode | undefined): unknown => ({ title: node?.title, url: node?.url, children: node?.children?.map((child) => shape(child)) });
const titlesIn = (chrome: WritableChrome, id: string): string[] => find(chrome.tree, id)?.children?.map((child) => child.title) ?? [];

test('copies a dropped bookmark folder into the root', async () => {
  const chrome = new WritableChrome(TREE);
  const ids = await new BookmarkCopier(chrome.writer).copy(['20'], '40', 0);
  assert.deepEqual(titlesIn(chrome, '40'), ['Music', 'Old']);
  assert.deepEqual(shape(find(chrome.tree, ids[0] ?? '')), {
    title: 'Music',
    url: undefined,
    children: [
      { title: 'Radio', url: 'https://radio.example/', children: undefined },
      { title: 'Jazz', url: undefined, children: [{ title: 'Blue', url: 'https://blue.example/', children: undefined }] },
      { title: 'Mix', url: 'https://mix.example/', children: undefined },
    ],
  });
});

test('skips separators when copying a folder', async () => {
  const chrome = new WritableChrome(TREE);
  const [id] = await new BookmarkCopier(chrome.writer).copy(['20'], '40');
  assert.deepEqual(titlesIn(chrome, id ?? ''), ['Radio', 'Jazz', 'Mix']);
  assert.equal(chrome.created.includes(''), false);
});

test('never changes the original bookmarks', async () => {
  const chrome = new WritableChrome(TREE);
  const before = structuredClone(chrome.tree);
  await new BookmarkCopier(chrome.writer).copy(['20', '31'], '40');
  assert.deepEqual(find(chrome.tree, '30'), find(before, '30'));
  assert.equal(chrome.calls.some((call) => /^(update|remove|removeTree|move)\b/.test(call)), false);
});

test('ignores a folder dropped into itself', async () => {
  const chrome = new WritableChrome(TREE);
  const copier = new BookmarkCopier(chrome.writer);
  assert.deepEqual(await copier.copy(['20'], '20'), []);
  assert.deepEqual(await copier.copy(['30', '31'], '23'), []);
  assert.equal(chrome.calls.some((call) => call.startsWith('create')), false);
  assert.deepEqual(titlesIn(chrome, '20'), ['Radio', '', 'Jazz', 'Mix']);
});

test('copies every selected bookmark in order', async () => {
  const chrome = new WritableChrome(TREE);
  const ids = await new BookmarkCopier(chrome.writer).copy(['32', '20', '31'], '40', 1);
  assert.equal(ids.length, 3);
  assert.deepEqual(titlesIn(chrome, '40'), ['Old', 'Go', 'Music', 'Chess']);
});

test('removes a partial copy when a write fails', async () => {
  const chrome = new WritableChrome(TREE);
  const writer = chrome.writer;
  let creates = 0;
  const failing = {
    create: async (details: NewBookmark): Promise<BookmarkNode> => {
      creates += 1;
      if (creates === 5) {
        throw new Error('create failed');
      }
      return writer.create(details);
    },
    get: (id: string): Promise<BookmarkNode> => writer.get(id),
    subTree: (id: string): Promise<BookmarkNode> => writer.subTree(id),
    removeTree: (id: string): Promise<void> => writer.removeTree(id),
  };
  await assert.rejects(new BookmarkCopier(failing).copy(['31', '20'], '40'), /create failed/);
  assert.deepEqual(titlesIn(chrome, '40'), ['Old']);
  assert.equal(chrome.calls.filter((call) => call.startsWith('removeTree')).length, 2);
});

test('copies a folder of 500 bookmarks in under two seconds', async () => {
  const many = Array.from({ length: 500 }, (_, at) => link(`b${at}`, `Link ${at}`, `https://site${at}.example/`));
  const chrome = new WritableChrome(bookmarkTree([folder('30', 'Big', many), folder('40', 'Root')]));
  const started = performance.now();
  const [id] = await new BookmarkCopier(chrome.writer).copy(['30'], '40');
  assert.ok(performance.now() - started < 2000);
  assert.equal(find(chrome.tree, id ?? '')?.children?.length, 500);
});
