import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE_ATTRIBUTE } from '../../../src/modules/favorites/FavoritesView.js';
import { PinnedTileMinus, TILE_MINUS_ATTRIBUTE } from '../../../src/modules/favorites/PinnedTileMinus.js';
import { asDocument, DomDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';

interface Setup {
  dom: DomDocument;
  pinned: DomNode;
  favorite: DomNode;
  unloaded: number[];
}

const grid = (dom: DomDocument, source?: string): DomNode => {
  const element = dom.createElement('div');
  element.setAttribute('data-vivarcdi-tiles', '');
  if (source !== undefined) {
    element.setAttribute('data-vivarcdi-tile-source', source);
  }
  const tile = dom.createElement('div');
  tile.setAttribute(TILE_ATTRIBUTE, '1');
  element.append(tile);
  return element;
};

function setup(): Setup {
  const dom = new DomDocument();
  return { dom, pinned: grid(dom, 'pinned'), favorite: grid(dom), unloaded: [] };
}

const hasMinus = (tile: DomNode): boolean => tile.children.some((child) => child.hasAttribute(TILE_MINUS_ATTRIBUTE));

const press = (dom: DomDocument, type: string, target: DomNode): { prevented: boolean; stopped: boolean } => {
  let prevented = false;
  let stopped = false;
  dom.emit(type, {
    target,
    preventDefault: (): void => void (prevented = true),
    stopImmediatePropagation: (): void => void (stopped = true),
  });
  return { prevented, stopped };
};

test('keeps the minus off a Favorite tile', () => {
  const { dom, pinned, favorite, unloaded } = setup();
  const minus = new PinnedTileMinus({
    document: asDocument(dom),
    grid: (): HTMLElement => pinned as unknown as HTMLElement,
    unload: (tabId): void => void unloaded.push(tabId),
  });
  minus.start();
  minus.sync();
  const pinnedTile = pinned.children[0];
  const favoriteTile = favorite.children[0];
  assert.ok(pinnedTile !== undefined);
  assert.ok(favoriteTile !== undefined);
  assert.ok(hasMinus(pinnedTile));
  assert.equal(hasMinus(favoriteTile), false);
  const click = press(dom, 'click', favoriteTile);
  assert.deepEqual([click.prevented, click.stopped], [false, false]);
  assert.deepEqual(unloaded, []);
  minus.stop();
  assert.equal(hasMinus(pinnedTile), false);
});
