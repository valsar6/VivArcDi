import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IconSymbols } from '../../../src/shared/icons/IconSymbols.js';

const IDS = [
  'star', 'bookmark', 'heart', 'bolt', 'triangle', 'gear', 'bell', 'pin', 'chat', 'people', 'plane', 'ball',
  'moon', 'globe', 'music', 'camera', 'code', 'smile', 'home', 'book', 'mail', 'cloud', 'flag', 'key',
];

test('has the 24 symbols of the design with unique ids and a path each', () => {
  const symbols = IconSymbols.all();
  assert.deepEqual(symbols.map((symbol) => symbol.id), IDS);
  assert.equal(new Set(symbols.map((symbol) => symbol.path)).size, IDS.length);
  symbols.forEach((symbol) => {
    assert.notEqual(symbol.path, '');
    assert.notEqual(symbol.label, '');
  });
});

test('finds a symbol by id and gives undefined for an unknown id', () => {
  assert.equal(IconSymbols.byId('heart')?.id, 'heart');
  assert.equal(IconSymbols.byId('nothing'), undefined);
});
