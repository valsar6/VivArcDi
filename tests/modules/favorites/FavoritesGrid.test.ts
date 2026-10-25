import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { Logger } from '../../../src/core/Logger.js';
import type { ModuleContext } from '../../../src/core/Module.js';
import { FAVORITE_ATTRIBUTE, GRID_ATTRIBUTE } from '../../../src/modules/favorites/FavoriteTagger.js';
import { FavoritesGrid } from '../../../src/modules/favorites/FavoritesGrid.js';
import { SilentSink } from '../../loader/fakes.js';
import { FakeNode, FakeTabs, selectors, tabBar, tabSlot } from './fakes.js';

class FakeObserver {
  public observe(): void {}

  public disconnect(): void {}
}

class FakeDocument {
  public elements: Record<string, FakeNode>;
  public listeners = new Map<string, unknown>();

  constructor(elements: Record<string, FakeNode>) {
    this.elements = elements;
  }

  public querySelector(selector: string): FakeNode | null {
    return this.elements[selector] ?? null;
  }

  public addEventListener(type: string, listener: unknown): void {
    this.listeners.set(type, listener);
  }

  public removeEventListener(type: string): void {
    this.listeners.delete(type);
  }
}

const globals = ['MutationObserver', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame'] as const;
let saved: Record<string, unknown> = {};

beforeEach(() => {
  saved = Object.fromEntries(globals.map((name) => [name, Reflect.get(globalThis, name)]));
  Object.assign(globalThis, {
    MutationObserver: FakeObserver,
    ResizeObserver: FakeObserver,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
  });
});

afterEach(() => Object.assign(globalThis, saved));

function setUp(tabs: unknown): {
  context: ModuleContext;
  document: FakeDocument;
  strip: FakeNode;
  sink: SilentSink;
} {
  const { bar, strip } = tabBar({ slots: [tabSlot(1, { pinned: true }), tabSlot(2)] });
  const document = new FakeDocument({ '#browser': new FakeNode(), '#tabs-tabbar-container': bar });
  const sink = new SilentSink();
  const context = {
    document,
    selectors,
    logger: new Logger('test', sink),
    options: {},
    tabs,
  } as unknown as ModuleContext;
  return { context, document, strip, sink };
}

test('start lays out the grid and stop removes it', async () => {
  const fakeTabs = new FakeTabs([{ id: 1, pinned: true }]);
  const { context, document, strip } = setUp(fakeTabs);
  const grid = new FavoritesGrid();
  await grid.start(context);
  assert.ok(strip.hasAttribute(GRID_ATTRIBUTE));
  assert.ok(strip.children[0]?.hasAttribute(FAVORITE_ATTRIBUTE));
  assert.ok(document.listeners.has('auxclick'));
  grid.stop();
  assert.equal(strip.hasAttribute(GRID_ATTRIBUTE), false);
  assert.equal(strip.children[0]?.hasAttribute(FAVORITE_ATTRIBUTE), false);
  assert.equal(document.listeners.size, 0);
});

test('without chrome.tabs the grid still works and middle click is left alone', async () => {
  const { context, document, strip, sink } = setUp({ available: false });
  await new FavoritesGrid().start(context);
  assert.ok(strip.children[0]?.hasAttribute(FAVORITE_ATTRIBUTE));
  assert.equal(document.listeners.size, 0);
  assert.match((sink.lines[0] ?? []).join(' '), /chrome.tabs is missing/);
});
