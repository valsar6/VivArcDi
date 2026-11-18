import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StoredFormat } from '../../../src/core/browser/StoredFormat.js';

const readList = (data: unknown): { value: string[]; skipped: boolean } | null =>
  Array.isArray(data) ? { value: data.map(String), skipped: false } : null;

const list = new StoredFormat<string[]>({ empty: [], read: readList });
const second = new StoredFormat<string[]>({ empty: [], read: readList, upgrades: [(data): unknown => data] });

test('reads a value without a version as version 1', () => {
  assert.deepEqual(list.decode('["a","b"]'), { status: 'current', value: ['a', 'b'], skipped: false });
  const object = new StoredFormat<Record<string, number>>({
    empty: {},
    read: (data): { value: Record<string, number>; skipped: boolean } => ({
      value: data as Record<string, number>,
      skipped: false,
    }),
  });
  assert.deepEqual(object.decode('{}'), { status: 'current', value: {}, skipped: false });
  assert.deepEqual(object.decode('{"a":1}').value, { a: 1 });
  assert.equal(list.decode(null).status, 'empty');
});

test('saves a version 1 value as before', () => {
  assert.equal(list.version, 1);
  assert.equal(list.encode(['a', 'b']), '["a","b"]');
});

test('saves a later version in an envelope', () => {
  assert.equal(second.version, 2);
  assert.equal(second.encode(['a']), '{"vivarcdi:version":2,"vivarcdi:data":["a"]}');
  assert.deepEqual(second.decode(second.encode(['a'])).value, ['a']);
});

test('treats a bad version as unreadable', () => {
  for (const version of ['0', '-1', '1.5', '"2"', 'null']) {
    const result = list.decode(`{"vivarcdi:version":${version},"vivarcdi:data":["a"]}`);
    assert.equal(result.status, 'unreadable', version);
    assert.deepEqual(result.value, []);
  }
});
