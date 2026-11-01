import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BookmarkWriter } from '../../../src/core/bookmarks/BookmarkWriter.js';
import { BrowserBookmarks } from '../../../src/core/bookmarks/BrowserBookmarks.js';
import { WritableChrome, bookmarkTree, folder, link, recordingChrome } from '../../modules/folders/fakes.js';

const titlesUnder = (chrome: WritableChrome, id: string): string[] => {
  const find = (nodes: typeof chrome.tree): (typeof chrome.tree)[number] | undefined =>
    nodes.flatMap((node) => (node.id === id ? [node] : find(node.children ?? []) ?? [])).at(0);
  return find(chrome.tree)?.children?.map((child) => child.title) ?? [];
};

test('creates the workspace folder on the first write', async () => {
  const chrome = new WritableChrome(bookmarkTree([folder('10', 'Hobbies')]));
  const id = await chrome.writer.ensurePath(['VivArcDi', 'Casetta']);
  assert.deepEqual(chrome.calls.filter((call) => call.startsWith('create')), ['create VivArcDi', 'create Casetta']);
  assert.deepEqual(titlesUnder(chrome, id), []);
  assert.equal(await chrome.writer.ensurePath(['VivArcDi', 'Casetta']), id);
  assert.equal(chrome.calls.filter((call) => call.startsWith('create')).length, 2);
});

test('creates only the folders of the path that are missing', async () => {
  const chrome = new WritableChrome(bookmarkTree([folder('10', 'VivArcDi', [folder('11', 'Work')])]));
  await chrome.writer.ensurePath(['VivArcDi', 'Casetta']);
  assert.deepEqual(chrome.calls.filter((call) => call.startsWith('create')), ['create Casetta']);
  assert.deepEqual(titlesUnder(chrome, '10'), ['Work', 'Casetta']);
});

test('never creates the same folder twice when writes overlap', async () => {
  const chrome = new WritableChrome(bookmarkTree([]));
  const [first, second] = await Promise.all([chrome.writer.ensurePath(['VivArcDi', 'Tabs']), chrome.writer.ensurePath(['VivArcDi', 'Tabs'])]);
  assert.equal(first, second);
  assert.deepEqual(chrome.calls.filter((call) => call.startsWith('create')), ['create VivArcDi', 'create Tabs']);
});

test('creates, renames and removes a link', async () => {
  const chrome = new WritableChrome(bookmarkTree([folder('10', 'Hobbies', [link('11', 'Old', 'https://a.example/')])]));
  const created = await chrome.writer.create({ parentId: '10', title: 'New', url: 'https://b.example/', index: 0 });
  assert.deepEqual(titlesUnder(chrome, '10'), ['New', 'Old']);
  assert.equal((await chrome.writer.update(created.id, 'Newer')).title, 'Newer');
  await chrome.writer.remove(created.id);
  assert.deepEqual(titlesUnder(chrome, '10'), ['Old']);
  assert.equal((await chrome.writer.children('10')).length, 1);
});

test('rejects when Vivaldi reports an error and keeps working afterwards', async () => {
  const chrome = new WritableChrome(bookmarkTree([]));
  chrome.failing.add('create');
  await assert.rejects(chrome.writer.create({ title: 'x' }), /create x failed/);
  await assert.rejects(chrome.writer.ensurePath(['A', 'B']), /create A failed/);
  chrome.failing.clear();
  await chrome.writer.ensurePath(['A', 'B']);
});

test('refuses an empty path and works only where chrome.bookmarks can write', async () => {
  const chrome = new WritableChrome(bookmarkTree([]));
  await assert.rejects(chrome.writer.ensurePath([]));
  assert.equal(new BookmarkWriter(undefined).available, false);
  assert.equal(new BookmarkWriter({ bookmarks: { getTree: (): void => undefined } }).available, false);
  await assert.rejects(new BookmarkWriter(undefined).create({ title: 'x' }), /not available/);
  assert.equal(chrome.writer.available, true);
});

test('reading through BrowserBookmarks never writes', async () => {
  const { calls, bookmarks } = recordingChrome(bookmarkTree([folder('10', 'Hobbies')]));
  await bookmarks.getTree();
  bookmarks.onChange(() => undefined);
  assert.equal(calls.some((call) => ['create', 'update', 'move', 'remove', 'removeTree'].includes(call)), false);
  assert.equal(['create', 'update', 'remove'].some((name) => name in BrowserBookmarks.prototype), false);
});
