import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRAGGING_ATTRIBUTE } from '../../src/core/RowDrag.js';
import { TabDragPill } from '../../src/core/TabDragPill.js';
import type { PillContent } from '../../src/core/DragPill.js';
import { silentLogger } from '../modules/reopen/fakes.js';
import { asDocument, DomDocument } from './dom.js';
import type { DomNode } from './dom.js';

interface Setup {
  slot: DomNode;
  calls: string[];
  tabPill: TabDragPill;
  fail: { on: boolean };
}

function setup(): Setup {
  const dom = new DomDocument();
  const calls: string[] = [];
  const fail = { on: false };
  const tabPill = new TabDragPill({
    document: asDocument(dom),
    wrapperSelector: '.wrapper',
    tabs: {
      get: async (id): Promise<chrome.tabs.Tab> => {
        if (fail.on) {
          throw new Error('gone');
        }
        return { id, title: 'Example', favIconUrl: 'https://example.com/i.png' } as chrome.tabs.Tab;
      },
    },
    pill: {
      show: (content: PillContent, x: number, y: number): void => void calls.push(`show ${content.title} ${content.iconUrl} ${x},${y}`),
      move: (x: number, y: number): void => void calls.push(`move ${x},${y}`),
      hide: (): void => void calls.push('hide'),
    },
    logger: silentLogger(),
  });
  return { slot: dom.list, calls, tabPill, fail };
}

const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

test('shows the title and icon of the dragged tab and fades its slot', async () => {
  const { slot, calls, tabPill } = setup();
  tabPill.drag(3, 10, 20);
  assert.equal(slot.hasAttribute(DRAGGING_ATTRIBUTE), true);
  await settle();
  tabPill.drag(3, 30, 40);
  assert.deepEqual(calls.filter((call) => call !== 'hide'), ['show Example https://example.com/i.png 10,20', 'move 30,40']);
});

test('removes the pill and restores the slot when the drag ends', async () => {
  const { slot, calls, tabPill } = setup();
  tabPill.drag(3, 10, 20);
  await settle();
  tabPill.end();
  assert.equal(slot.hasAttribute(DRAGGING_ATTRIBUTE), false);
  assert.equal(calls.at(-1), 'hide');
});

test('does not show the pill of a drag that ended before the tab was read', async () => {
  const { calls, tabPill } = setup();
  tabPill.drag(3, 10, 20);
  tabPill.end();
  await settle();
  assert.equal(calls.some((call) => call.startsWith('show')), false);
});

test('shows nothing when the tab cannot be read', async () => {
  const { calls, tabPill, fail } = setup();
  fail.on = true;
  tabPill.drag(3, 10, 20);
  await settle();
  assert.equal(calls.some((call) => call.startsWith('show')), false);
});

test('gives the hooks of a tab drag', async () => {
  const { calls, tabPill } = setup();
  const { onDrag, onEnd } = tabPill.hooks();
  onDrag(3, 1, 2);
  await settle();
  onEnd();
  assert.deepEqual(calls.filter((call) => call !== 'hide'), ['show Example https://example.com/i.png 1,2']);
  assert.equal(calls.at(-1), 'hide');
});
