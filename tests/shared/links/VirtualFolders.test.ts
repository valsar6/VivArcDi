import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { TreeEntry } from '../../../src/shared/links/FolderEntries.js';
import { VirtualFolders } from '../../../src/shared/links/VirtualFolders.js';

const live = (id: string, rows: string[] = []): TreeEntry => ({
  kind: 'folder',
  id: `live:${id}`,
  title: id,
  depth: 0,
  live: true,
  children: rows.map((row) => ({ kind: 'link', id: `live:${id}:${row}`, title: row, url: `https://a.example/${row}`, key: `a.example/${row}`, depth: 1 })),
});

test('shares one state per scope', () => {
  const scope = {};
  assert.equal(VirtualFolders.of(scope), VirtualFolders.of(scope));
  assert.notEqual(VirtualFolders.of(scope), VirtualFolders.of({}));
});

test('keeps the entries of each workspace apart', () => {
  const virtual = VirtualFolders.of({});
  virtual.set('5', [live('a')]);
  virtual.set(null, [live('b')]);
  assert.deepEqual(virtual.entriesFor('5').map((entry) => entry.id), ['live:a']);
  assert.deepEqual(virtual.entriesFor(null).map((entry) => entry.id), ['live:b']);
  assert.deepEqual(virtual.entriesFor('6'), []);
});

test('reports only real changes', () => {
  const virtual = VirtualFolders.of({});
  let calls = 0;
  const stop = virtual.onChange(() => void (calls += 1));
  virtual.set('5', []);
  virtual.set('5', [live('a')]);
  virtual.set('5', [live('a')]);
  virtual.set('5', []);
  assert.equal(calls, 2);
  stop();
  virtual.set('5', [live('b')]);
  assert.equal(calls, 2);
});

test('knows the ids of folders and rows in any workspace', () => {
  const virtual = VirtualFolders.of({});
  virtual.set('5', [live('a', ['1'])]);
  virtual.set('6', [live('b')]);
  assert.deepEqual(['live:a', 'live:a:1', 'live:b', 'live:a:2', '77'].map((id) => virtual.has(id)), [true, true, true, false, false]);
});

test('says once that the source is ready', () => {
  const virtual = VirtualFolders.of({});
  let calls = 0;
  virtual.onChange(() => void (calls += 1));
  assert.equal(virtual.ready, false);
  virtual.markReady();
  virtual.markReady();
  assert.equal(virtual.ready, true);
  assert.equal(calls, 1);
});

test('gives the clicks to the handlers of the source and forgets them when removed', () => {
  const virtual = VirtualFolders.of({});
  const seen: string[] = [];
  virtual.rename('live:a', 'nobody listens');
  const remove = virtual.handle({
    rename: (id, name): void => void seen.push(`rename ${id} ${name}`),
    open: (id): void => void seen.push(`open ${id}`),
    menu: (id, x, y): void => void seen.push(`menu ${id} ${x} ${y}`),
    activate: (id): boolean => (seen.push(`activate ${id}`), id === 'live:a:connect'),
  });
  virtual.rename('live:a', 'Mine');
  virtual.open('live:a');
  virtual.openMenu('live:a', 3, 4);
  assert.equal(virtual.activate('live:a:connect'), true);
  assert.equal(virtual.activate('live:a:7'), false);
  remove();
  virtual.open('live:a');
  assert.equal(virtual.activate('live:a:connect'), false);
  assert.deepEqual(seen, ['rename live:a Mine', 'open live:a', 'menu live:a 3 4', 'activate live:a:connect', 'activate live:a:7']);
});

test('asks the section to show a folder open', () => {
  const virtual = VirtualFolders.of({});
  const seen: string[] = [];
  const stop = virtual.onReveal((id) => void seen.push(id));
  virtual.reveal('live:a');
  stop();
  virtual.reveal('live:b');
  assert.deepEqual(seen, ['live:a']);
});
