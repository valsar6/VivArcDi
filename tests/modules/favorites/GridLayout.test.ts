import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GridLayout } from '../../../src/modules/favorites/GridLayout.js';
import { asElement, FakeNode } from './fakes.js';

const settings = { maxColumns: 3, tileMinWidth: 64, tileHeight: 44, gap: 6 };

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

test('a full row never has more than three columns', () => {
  assert.equal(GridLayout.columnsFor(220, 12, settings), 3);
  assert.equal(GridLayout.columnsFor(600, 12, settings), 3);
  assert.equal(GridLayout.columnsFor(0, 12, settings), 3);
});

test('fewer tiles than columns stretch to fill the row', () => {
  assert.equal(GridLayout.columnsFor(600, 2, settings), 2);
  assert.equal(GridLayout.columnsFor(600, 1, settings), 1);
  assert.equal(GridLayout.columnsFor(600, 0, settings), 1);
});

test('a tab bar too narrow for three tiles gets fewer columns', () => {
  assert.equal(GridLayout.columnsFor(150, 12, settings), 2);
  assert.equal(GridLayout.columnsFor(60, 12, settings), 1);
});

test('follow sets the grid variables and tracks resizes and tile counts', () => {
  const strip = new FakeNode();
  strip.clientWidth = 600;
  const layout = new GridLayout(settings, observerClass);
  layout.follow(asElement(strip), 5);
  assert.equal(strip.properties.get('--vivarcdi-favorites-columns'), '3');
  assert.equal(strip.properties.get('--vivarcdi-favorites-tile-height'), '44px');
  assert.equal(strip.properties.get('--vivarcdi-favorites-gap'), '6px');
  FakeResizeObserver.last?.resize(140);
  assert.equal(strip.properties.get('--vivarcdi-favorites-columns'), '2');
  FakeResizeObserver.last?.resize(600);
  layout.follow(asElement(strip), 2);
  assert.equal(strip.properties.get('--vivarcdi-favorites-columns'), '2');
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
