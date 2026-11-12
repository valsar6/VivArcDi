import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FavoriteReorder } from '../../../src/modules/favorites/FavoriteReorder.js';
import { WritableChrome, bookmarkTree, folder, link } from '../folders/fakes.js';
import { silentLogger } from './linked.js';

const grid = (): WritableChrome =>
  new WritableChrome(
    bookmarkTree([
      folder('10', 'Favorites', [link('11', 'A', 'https://a.example/'), link('12', 'B', 'https://b.example/'), link('13', 'C', 'https://c.example/'), link('14', 'D', 'https://d.example/')]),
    ]),
  );

const order = async (chrome: WritableChrome): Promise<string[]> => (await chrome.writer.children('10')).map((child) => child.title);

const reorder = (chrome: WritableChrome): FavoriteReorder => new FavoriteReorder({ writer: chrome.writer, logger: silentLogger });

test('moves a dropped tile before another tile', async () => {
  const chrome = grid();
  await reorder(chrome).move('14', '12');
  assert.deepEqual(await order(chrome), ['A', 'D', 'B', 'C']);
  await reorder(chrome).move('11', '13');
  assert.deepEqual(await order(chrome), ['D', 'B', 'A', 'C']);
});

test('moves a dropped tile to the end of the grid', async () => {
  const chrome = grid();
  await reorder(chrome).move('11', null);
  assert.deepEqual(await order(chrome), ['B', 'C', 'D', 'A']);
});

test('leaves a tile released at its own place', async () => {
  const chrome = grid();
  await reorder(chrome).move('12', '12');
  await reorder(chrome).move('12', '13');
  await reorder(chrome).move('14', null);
  assert.deepEqual(await order(chrome), ['A', 'B', 'C', 'D']);
  assert.deepEqual(chrome.calls.filter((call) => call.startsWith('move')), []);
});

test('moves a bookmark inside its folder with the index counted before it leaves', async () => {
  const chrome = grid();
  const moved = await chrome.writer.move('11', { parentId: '10', index: 3 });
  assert.equal(moved.title, 'A');
  assert.deepEqual(await order(chrome), ['B', 'C', 'A', 'D']);
});
