import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { MenuItem } from '../../../../src/core/dom/ContextMenu.js';
import { RowMenu } from '../../../../src/modules/folders/editing/RowMenu.js';
import { asDocument, DomDocument } from '../../../core/dom.js';

function setup(): { dom: DomDocument; opened: Array<{ labels: string[]; x: number; y: number }>; items: () => MenuItem[]; calls: string[] } {
  const dom = new DomDocument();
  const opened: Array<{ labels: string[]; x: number; y: number }> = [];
  let last: MenuItem[] = [];
  const calls: string[] = [];
  new RowMenu({
    document: asDocument(dom),
    menu: {
      open: (items, x, y): void => {
        last = items;
        opened.push({ labels: items.map((item) => item.label ?? ''), x, y });
      },
      close: (): void => undefined,
    },
    removal: { removePin: async (id): Promise<void> => void calls.push(`removePin ${id}`), tile: async (id): Promise<void> => void calls.push(`tile ${id}`) },
  }).attach();
  return { dom, opened, items: (): MenuItem[] => last, calls };
}

const rightClick = (dom: DomDocument, target: unknown): { prevented: number } => {
  const seen = { prevented: 0 };
  dom.emit('contextmenu', { target, clientX: 7, clientY: 9, preventDefault: (): number => (seen.prevented += 1), stopPropagation: (): void => undefined });
  return seen;
};

test('opens the menu of a link row with Remove pin and Tile tab', () => {
  const { dom, opened, items, calls } = setup();
  const row = dom.createElement('div');
  row.setAttribute('data-vivarcdi-link-id', '33');
  assert.equal(rightClick(dom, row).prevented, 1);
  assert.deepEqual(opened, [{ labels: ['Remove pin', 'Tile tab'], x: 7, y: 9 }]);
  items().forEach((item) => {
    if ('run' in item) {
      item.run();
    }
  });
  assert.deepEqual(calls, ['removePin 33', 'tile 33']);
});

test('leaves the menu of anything else to Vivaldi', () => {
  const { dom, opened } = setup();
  assert.equal(rightClick(dom, dom.createElement('div')).prevented, 0);
  assert.equal(rightClick(dom, null).prevented, 0);
  assert.deepEqual(opened, []);
});

test('stops listening on detach', () => {
  const dom = new DomDocument();
  const row = new RowMenu({ document: asDocument(dom), menu: { open: (): void => undefined, close: (): void => undefined }, removal: { removePin: async (): Promise<void> => undefined, tile: async (): Promise<void> => undefined } });
  row.attach();
  row.detach();
  assert.equal([...dom.listeners.values()].flat().length, 0);
});

test('leaves the menu of a row of a live folder to Vivaldi', () => {
  const { dom, opened } = setup();
  const row = dom.createElement('div');
  row.setAttribute('data-vivarcdi-link-id', 'live:f1:7');
  assert.equal(rightClick(dom, row).prevented, 0);
  assert.deepEqual(opened, []);
});
