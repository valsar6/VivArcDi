import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GridLayout } from '../../../src/modules/favorites/GridLayout.js';
import { asElement, FakeNode } from './fakes.js';

const settings = { minColumns: 3, tileMinWidth: 64, tileHeight: 44, gap: 6 };

class FakeResizeObserver {
  public static last: FakeResizeObserver | null = null;

  public callback: (entries: Array<{ contentRect: { width: number } }>) => void;
  public observed: unknown[] = [];

  constructor(callback: (entries: Array<{ contentRect: { width: number } }>) => void) {
    this.callback = callback;
    FakeResizeObserver.last = this;
  }

  public observe(element: unknown): void {
    this.observed.push(element);
  }

  public disconnect(): void {
    this.observed = [];
  }

  public resize(width: number): void {
    this.callback([{ contentRect: { width } }]);
  }
}

const observerClass = FakeResizeObserver as unknown as typeof ResizeObserver;

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
  const layout = new GridLayout(settings, observerClass);
  layout.follow(asElement(strip));
  assert.equal(strip.properties.get('--vivarcdi-favorites-columns'), '3');
  assert.equal(strip.properties.get('--vivarcdi-favorites-tile-height'), '44px');
  assert.equal(strip.properties.get('--vivarcdi-favorites-gap'), '6px');
  FakeResizeObserver.last?.resize(344);
  assert.equal(strip.properties.get('--vivarcdi-favorites-columns'), '5');
});

test('release removes the variables and stops observing', () => {
  const strip = new FakeNode();
  const layout = new GridLayout(settings, observerClass);
  layout.follow(asElement(strip));
  const observer = FakeResizeObserver.last;
  layout.follow(null);
  assert.equal(strip.properties.size, 0);
  assert.deepEqual(observer?.observed, []);
});
