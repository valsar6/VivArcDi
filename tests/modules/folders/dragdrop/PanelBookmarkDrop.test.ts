import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DomDocument, asDocument } from '../../../core/dom.js';
import { DropPlace } from '../../../../src/modules/folders/dragdrop/DropPlace.js';
import type { DropTarget } from '../../../../src/modules/folders/dragdrop/DropTargets.js';
import { PanelBookmarkDrop } from '../../../../src/modules/folders/dragdrop/PanelBookmarkDrop.js';
import { PanelDragData } from '../../../../src/modules/folders/dragdrop/PanelDragData.js';
import type { AddPlace } from '../../../../src/modules/folders/favoritelinks/WorkspaceFavorites.js';

const TARGET: DropTarget = { kind: 'folder', id: '32' };

interface FakeEvent {
  prevented: boolean;
  stopped: boolean;
  dataTransfer: { types: string[]; dropEffect: string; getData: (type: string) => string } | null;
  [key: string]: unknown;
}

function setup(target: DropTarget | null = TARGET): { dom: DomDocument; panel: PanelBookmarkDrop; copies: Array<[string[], AddPlace]>; marks: Array<DropTarget | null>; drag: (type: string, types: string[], data?: string, extra?: Record<string, unknown>) => FakeEvent } {
  const dom = new DomDocument();
  const copies: Array<[string[], AddPlace]> = [];
  const marks: Array<DropTarget | null> = [];
  const panel = new PanelBookmarkDrop({
    document: asDocument(dom),
    targets: { at: (): DropTarget | null => target, mark: (next): void => void marks.push(next), clear: (): void => void marks.push(null) },
    place: new DropPlace(() => undefined),
    favorites: { copy: async (ids, place = {}): Promise<'copied'> => (copies.push([ids, place]), 'copied') },
  });
  panel.attach();
  const drag = (type: string, types: string[], data = '', extra: Record<string, unknown> = {}): FakeEvent => {
    const event: FakeEvent = {
      prevented: false,
      stopped: false,
      clientX: 5,
      clientY: 6,
      relatedTarget: null,
      dataTransfer: { types, dropEffect: 'none', getData: () => data },
      preventDefault(): void {
        event.prevented = true;
      },
      stopPropagation(): void {
        event.stopped = true;
      },
      ...extra,
    };
    dom.listeners.get(type)?.forEach((listener) => listener(event as unknown as Event));
    return event;
  };
  return { dom, panel, copies, marks, drag };
}

const PANEL = ['vivaldi/x-bookmarks', 'text/plain'];

test('accepts a panel drag over a target as a copy and marks the target', () => {
  const { drag, marks } = setup();
  const event = drag('dragover', PANEL);
  assert.equal(event.prevented, true);
  assert.equal(event.dataTransfer?.dropEffect, 'copy');
  assert.deepEqual(marks, [TARGET]);
});

test('copies the dragged bookmarks to the place of the drop', () => {
  const { drag, copies, marks } = setup();
  const event = drag('drop', PANEL, '["184","279"]');
  assert.deepEqual(copies, [[['184', '279'], { parentId: '32' }]]);
  assert.equal(event.prevented && event.stopped, true);
  assert.deepEqual(marks, [null]);
});

test('ignores drops that are not panel bookmarks', () => {
  const { drag, copies, marks } = setup();
  for (const type of ['dragover', 'drop']) {
    const event = drag(type, ['text/plain', 'text/uri-list'], '["1"]');
    assert.equal(event.prevented || event.stopped, false);
  }
  const outside = setup(null);
  for (const type of ['dragover', 'drop']) {
    const event = outside.drag(type, PANEL, '["1"]');
    assert.equal(event.prevented || event.stopped, false);
  }
  assert.deepEqual([copies, marks, outside.copies], [[], [], []]);
});

test('ignores a panel drop with unreadable ids', () => {
  const { drag, copies } = setup();
  for (const data of ['', 'not json', '{"a":1}', '[1,2]', '[]']) {
    drag('drop', PANEL, data);
  }
  assert.deepEqual(copies, []);
});

test('clears the mark when the drag leaves the window or ends', () => {
  const { drag, marks } = setup();
  drag('dragleave', PANEL, '', { relatedTarget: {} });
  assert.deepEqual(marks, []);
  drag('dragleave', PANEL);
  drag('dragend', PANEL);
  assert.deepEqual(marks, [null, null]);
});

test('stops listening and clears the mark on detach', () => {
  const { panel, drag, marks } = setup();
  panel.detach();
  assert.equal(drag('dragover', PANEL).prevented, false);
  assert.deepEqual(marks, [null]);
});

test('reads the ids of a panel drag', () => {
  assert.deepEqual(PanelDragData.ids({ getData: () => '["1","2"]' }), ['1', '2']);
  assert.equal(PanelDragData.carriesBookmarks(['vivaldi/x-bookmarks']), true);
  assert.equal(PanelDragData.carriesBookmarks(undefined), false);
});
