import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TAB_ENTRIES_TYPE } from '../../../src/core/TabEntries.js';
import { FolderDragDrop } from '../../../src/modules/folders/FolderDragDrop.js';
import type { AddPlace } from '../../../src/modules/folders/WorkspaceFavorites.js';
import { asDocument, asElement, DomDocument } from '../../core/dom.js';
import { silentLogger } from '../reopen/fakes.js';

const WRAPPER = '.wrapper';
const PAGE = 'https://example.com/page';

const rowOf = (tabId: number): unknown => {
  const wrapper = { dataset: { id: `tab-${tabId}` }, closest: (): unknown => wrapper, querySelector: (): null => null };
  return { closest: (): unknown => wrapper, querySelector: (): unknown => wrapper };
};

interface Setup {
  dom: DomDocument;
  added: Array<[number | undefined, AddPlace]>;
  press: (tabId: number) => void;
  html5: (type: 'dragover' | 'drop', types: string[], x: number, y: number) => { prevented: number; effect: string };
}

function setup(): Setup {
  const dom = new DomDocument();
  const section = dom.createElement('div');
  section.rect = { left: 0, right: 200, top: 0, bottom: 80 };
  ['33', '34'].forEach((id, index) => {
    const row = dom.createElement('div');
    row.setAttribute('data-vivarcdi-link-id', id);
    row.rect = { left: 0, right: 200, top: index * 40, bottom: index * 40 + 40 };
    section.append(row);
  });
  dom.parent.append(section);
  const added: Setup['added'] = [];
  const ids = ['33', '34'];
  new FolderDragDrop({
    document: asDocument(dom),
    wrapperSelector: WRAPPER,
    section: (): HTMLElement => asElement(section),
    header: (): null => null,
    tabs: { get: async (id): Promise<chrome.tabs.Tab> => ({ id, url: PAGE }) as chrome.tabs.Tab },
    favorites: {
      add: async (tab, place = {}): Promise<'added'> => (added.push([tab.id, place]), 'added'),
      addLink: async (): Promise<'added'> => 'added',
      copy: async (): Promise<'copied'> => 'copied',
    },
    indexBefore: (id): number | undefined => (id === null ? undefined : ids.indexOf(id)),
    logger: silentLogger(),
  }).start();
  return {
    dom,
    added,
    press: (tabId): void => dom.emit('mousedown', { button: 0, buttons: 1, clientX: 500, clientY: 500, target: rowOf(tabId) }),
    html5: (type, types, x, y): ReturnType<Setup['html5']> => {
      const seen = { prevented: 0, effect: 'none' };
      const dataTransfer = {
        types,
        get dropEffect(): string {
          return seen.effect;
        },
        set dropEffect(value: string) {
          seen.effect = value;
        },
      };
      dom.emit(type, { clientX: x, clientY: y, dataTransfer, preventDefault: (): number => (seen.prevented += 1) });
      return seen;
    },
  };
}

const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

test('adds a tab dropped with an html5 drag at the position of the drop', async () => {
  const { added, press, html5 } = setup();
  press(7);
  const over = html5('dragover', [TAB_ENTRIES_TYPE], 10, 50);
  assert.equal(over.prevented, 1);
  assert.equal(over.effect, 'move');
  html5('drop', [TAB_ENTRIES_TYPE], 10, 50);
  await settle();
  assert.deepEqual(added, [[7, { index: 1 }]]);
});

test('ignores html5 drags that carry no tab', async () => {
  const { added, press, html5 } = setup();
  press(7);
  const over = html5('dragover', ['text/uri-list'], 10, 50);
  const drop = html5('drop', ['text/uri-list'], 10, 50);
  await settle();
  assert.equal(over.prevented, 0);
  assert.equal(drop.prevented, 0);
  assert.deepEqual(added, []);
});

test('adds one link per drag', async () => {
  const { dom, added, press, html5 } = setup();
  press(7);
  dom.emit('mousemove', { buttons: 1, clientX: 10, clientY: 50 });
  dom.emit('mouseup', { buttons: 0, clientX: 10, clientY: 50 });
  html5('drop', [TAB_ENTRIES_TYPE], 10, 50);
  await settle();
  assert.deepEqual(added, [[7, { index: 1 }]]);
});
