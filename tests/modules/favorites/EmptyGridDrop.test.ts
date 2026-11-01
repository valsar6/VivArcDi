import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Logger } from '../../../src/core/Logger.js';
import { DROP_OVER_ATTRIBUTE, EMPTY_GRID_ATTRIBUTE, EmptyGridDrop } from '../../../src/modules/favorites/EmptyGridDrop.js';
import { DomDocument, asDocument } from '../../core/dom.js';
import { SilentSink } from '../../loader/fakes.js';

const WRAPPER = '.wrapper';
const HINT = 'Drag a tab here to pin it';

const rowOf = (tabId: number): unknown => {
  const wrapper = { dataset: { id: `tab-${tabId}` }, closest: (): unknown => wrapper, querySelector: (): null => null };
  return { closest: (): unknown => wrapper, querySelector: (): unknown => wrapper };
};

function setUp(tab: Partial<chrome.tabs.Tab> = { url: 'https://example.com/' }): {
  dom: DomDocument;
  drop: EmptyGridDrop;
  updates: Array<[number, Record<string, unknown>]>;
  placed: () => boolean;
  drag: (toX: number, toY: number) => void;
} {
  const dom = new DomDocument();
  const updates: Array<[number, Record<string, unknown>]> = [];
  let placed = false;
  const drop = new EmptyGridDrop({
    document: asDocument(dom),
    wrapperSelector: WRAPPER,
    anchor: {
      add: (element): (() => void) => {
        placed = true;
        Object.assign(element, { getBoundingClientRect: (): object => ({ left: 0, right: 100, top: 0, bottom: 40 }) });
        return () => {
          placed = false;
        };
      },
    },
    tabs: {
      get: async (id: number): Promise<chrome.tabs.Tab> => ({ id, ...tab }) as chrome.tabs.Tab,
      update: async (id: number, properties: Record<string, unknown>): Promise<chrome.tabs.Tab> => {
        updates.push([id, properties]);
        return {} as chrome.tabs.Tab;
      },
    },
    hint: HINT,
    logger: new Logger('test', new SilentSink()),
  });
  drop.start();
  const drag = (toX: number, toY: number): void => {
    dom.emit('mousedown', { button: 0, buttons: 1, clientX: 200, clientY: 200, target: rowOf(7) });
    dom.emit('mousemove', { buttons: 1, clientX: toX, clientY: toY });
    dom.emit('mouseup', { buttons: 0, clientX: toX, clientY: toY });
  };
  return { dom, drop, updates, placed: () => placed, drag };
}

const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

test('shows a placeholder while the grid has no tiles', () => {
  const { dom, drop, placed } = setUp();
  drop.show(true);
  const element = dom.created[0];
  assert.ok(placed());
  assert.ok(element?.hasAttribute(EMPTY_GRID_ATTRIBUTE));
  assert.equal(element?.textContent, HINT);
  drop.show(true);
  assert.equal(dom.created.length, 1);
  drop.show(false);
  assert.equal(placed(), false);
  drop.show(true);
  assert.ok(placed());
  drop.stop();
  assert.equal(placed(), false);
});

test('pins a tab released on the empty grid', async () => {
  const { dom, drop, updates, drag } = setUp();
  drop.show(true);
  dom.emit('mousedown', { button: 0, buttons: 1, clientX: 200, clientY: 200, target: rowOf(7) });
  dom.emit('mousemove', { buttons: 1, clientX: 50, clientY: 20 });
  assert.ok(dom.created[0]?.hasAttribute(DROP_OVER_ATTRIBUTE));
  dom.emit('mouseup', { buttons: 0, clientX: 50, clientY: 20 });
  await settle();
  assert.deepEqual(updates, [[7, { pinned: true }]]);
  assert.equal(dom.created[0]?.hasAttribute(DROP_OVER_ATTRIBUTE), false);
  drag(500, 500);
  await settle();
  assert.equal(updates.length, 1);
});

test('does not pin a pinned tab, a link or a page that is not on the web', async () => {
  for (const tab of [{ url: 'https://example.com/', pinned: true }, { url: 'vivaldi://settings' }, {}]) {
    const { drop, updates, drag } = setUp(tab);
    drop.show(true);
    drag(50, 20);
    await settle();
    assert.deepEqual(updates, []);
  }
});

test('does not pin a tab released after the placeholder is removed', async () => {
  const { drop, updates, drag } = setUp();
  drop.show(true);
  drop.show(false);
  drag(50, 20);
  await settle();
  assert.deepEqual(updates, []);
});
