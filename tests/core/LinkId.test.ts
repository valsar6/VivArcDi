import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LinkId } from '../../src/core/LinkId.js';

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
