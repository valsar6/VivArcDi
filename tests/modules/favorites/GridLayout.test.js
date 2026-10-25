import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GridLayout } from '../../../src/modules/favorites/GridLayout.js';
import { FakeNode } from './fakes.js';

const settings = { minColumns: 3, tileMinWidth: 64, tileHeight: 44, gap: 6 };

class FakeResizeObserver {
  static last = null;

  constructor(callback) {
    this.callback = callback;
    this.observed = [];
    FakeResizeObserver.last = this;
  }

  observe(element) {
    this.observed.push(element);
  }

  disconnect() {
    this.observed = [];
  }

  resize(width) {
    this.callback([{ contentRect: { width } }]);
  }
}

test('a narrow tab bar keeps the minimum of three columns', () => {
  assert.equal(GridLayout.columnsFor(150, settings), 3);
  assert.equal(GridLayout.columnsFor(220, settings), 3);
  assert.equal(GridLayout.columnsFor(0, settings), 3);
});

test('a wider tab bar gets more columns', () => {
  assert.equal(GridLayout.columnsFor(274, settings), 4);
  assert.equal(GridLayout.columnsFor(344, settings), 5);
});

test('follow sets the grid variables and tracks resizes', () => {
  const strip = new FakeNode();
  strip.clientWidth = 200;
  const layout = new GridLayout(settings, FakeResizeObserver);
  layout.follow(strip);
  assert.equal(strip.properties.get('--vivarcdi-favorites-columns'), '3');
  assert.equal(strip.properties.get('--vivarcdi-favorites-tile-height'), '44px');
  assert.equal(strip.properties.get('--vivarcdi-favorites-gap'), '6px');
  FakeResizeObserver.last.resize(344);
  assert.equal(strip.properties.get('--vivarcdi-favorites-columns'), '5');
});

test('release removes the variables and stops observing', () => {
  const strip = new FakeNode();
  const layout = new GridLayout(settings, FakeResizeObserver);
  layout.follow(strip);
  const observer = FakeResizeObserver.last;
  layout.follow(null);
  assert.equal(strip.properties.size, 0);
  assert.deepEqual(observer.observed, []);
});
