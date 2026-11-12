import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BookmarkNode } from '../../../../src/core/browser/bookmarks/BookmarkNode.js';
import { DRAGGING_ATTRIBUTE } from '../../../../src/shared/dragdrop/RowDrag.js';
import { TAB_ENTRIES_TYPE } from '../../../../src/shared/dragdrop/TabEntries.js';
import { FolderDragDrop } from '../../../../src/modules/folders/dragdrop/FolderDragDrop.js';
import type { AddPlace } from '../../../../src/modules/folders/favoritelinks/WorkspaceFavorites.js';
import { asDocument, asElement, DomDocument } from '../../../core/dom.js';
import type { DomNode } from '../../../core/dom.js';
import { silentLogger } from '../../reopen/fakes.js';

const WRAPPER = '.wrapper';
const PAGE = 'https://example.com/page';

const rowOf = (tabId: number): unknown => {
  const wrapper = { dataset: { id: `tab-${tabId}` }, closest: (): unknown => wrapper, querySelector: (): null => null };
  return { closest: (): unknown => wrapper, querySelector: (): unknown => wrapper };
};

interface Setup {
  dom: DomDocument;
  row: DomNode;
  calls: string[];
  added: Array<[number | undefined, AddPlace]>;
  press: (tabId: number) => void;
  html5: (type: 'dragover' | 'drop', types: string[], x: number, y: number) => { prevented: number; effect: string };
}

function setup(): Setup {
  const dom = new DomDocument();
  const section = dom.createElement('div');
  section.rect = { left: 0, right: 200, top: 0, bottom: 80 };
  const rows = ['33', '34'].map((id, index) => {
    const row = dom.createElement('div');
    row.setAttribute('data-vivarcdi-link-id', id);
    row.rect = { left: 0, right: 200, top: index * 40, bottom: index * 40 + 40 };
    section.append(row);
    return row;
  });
  (dom as unknown as { elementFromPoint: () => null }).elementFromPoint = (): null => null;
  const calls: string[] = [];
  dom.parent.append(section);
  const added: Setup['added'] = [];
  const ids = ['33', '34'];
  new FolderDragDrop({
    document: asDocument(dom),
    wrapperSelector: WRAPPER,
    section: (): HTMLElement => asElement(section),
    header: (): null => null,
    stripSelector: '.strip',
    skipSelector: '.skip',
    pill: { show: (): void => undefined, move: (): void => undefined, hide: (): void => undefined },
    menu: { open: (): void => undefined, close: (): void => undefined },
    folderActions: { rename: (): void => undefined, remove: (): void => undefined },
    tabs: {
      get: async (id): Promise<chrome.tabs.Tab> => ({ id, url: PAGE }) as chrome.tabs.Tab,
      query: async (): Promise<chrome.tabs.Tab[]> => (calls.push('query'), []),
      create: async (): Promise<chrome.tabs.Tab> => (calls.push('create'), { id: 1 } as chrome.tabs.Tab),
      move: async (): Promise<chrome.tabs.Tab> => (calls.push('move'), { id: 1 } as chrome.tabs.Tab),
    },
    writer: { get: async (id): Promise<BookmarkNode> => (calls.push('get'), { id, title: '', url: PAGE }) },
    tabLinks: { link: async (): Promise<void> => void calls.push('link'), unlink: async (): Promise<void> => void calls.push('unlink') },
    notify: (): void => undefined,
    favorites: {
      take: async (): Promise<'none'> => (calls.push('take'), 'none'),
      add: async (tab, place = {}): Promise<'added'> => (added.push([tab.id, place]), 'added'),
      addLink: async (): Promise<'added'> => 'added',
      copy: async (): Promise<'copied'> => 'copied',
    },
    indexBefore: (id): number | undefined => (id === null ? undefined : ids.indexOf(id)),
    logger: silentLogger(),
  }).start();
  return {
    dom,
    row: rows[0] as DomNode,
    calls,
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

test('leaves the link in place when it is released elsewhere', async () => {
  const { dom, row, calls, added } = setup();
  dom.emit('mousedown', { button: 0, buttons: 1, clientX: 10, clientY: 10, target: row });
  dom.emit('mousemove', { buttons: 1, clientX: 10, clientY: 60 });
  dom.emit('mousemove', { buttons: 1, clientX: 400, clientY: 400 });
  assert.equal(row.hasAttribute(DRAGGING_ATTRIBUTE), true);
  dom.emit('mouseup', { buttons: 0, clientX: 400, clientY: 400 });
  let stopped = 0;
  dom.emit('click', { preventDefault: (): void => undefined, stopPropagation: (): number => (stopped += 1) });
  await settle();
  assert.equal(row.hasAttribute(DRAGGING_ATTRIBUTE), false);
  assert.equal(stopped, 1);
  assert.deepEqual(calls, []);
  assert.deepEqual(added, []);
});
