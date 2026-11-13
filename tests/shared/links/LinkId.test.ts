import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LinkId } from '../../../src/shared/links/LinkId.js';

test('tells virtual ids from bookmark ids', () => {
  assert.equal(LinkId.isVirtual('live:abc'), true);
  assert.equal(LinkId.isVirtual(LinkId.row('abc', '7')), true);
  assert.equal(LinkId.isVirtual('123'), false);
  assert.equal(LinkId.isVirtual(''), false);
});

test('makes the ids of a folder and of its rows', () => {
  assert.equal(LinkId.folder('abc'), 'live:abc');
  assert.equal(LinkId.row('abc', '7'), 'live:abc:7');
});

test('finds the folder of a folder id or of a row id', () => {
  assert.equal(LinkId.folderOf('live:abc'), 'abc');
  assert.equal(LinkId.folderOf('live:abc:7'), 'abc');
  assert.equal(LinkId.folderOf('123'), null);
});

test('finds the row of a row id, and none for a folder or a bookmark id', () => {
  assert.equal(LinkId.rowOf('live:abc:7'), '7');
  assert.equal(LinkId.rowOf('live:abc:connect'), 'connect');
  assert.equal(LinkId.rowOf('live:abc'), null);
  assert.equal(LinkId.rowOf('123'), null);
});
