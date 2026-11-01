import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DropTargets } from '../../../src/modules/folders/DropTargets.js';
import { DomDocument, asElement } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';

const ROW_HEIGHT = 30;

function row(dom: DomDocument, section: DomNode, [kind, id, depth]: ['folder' | 'link', string, number]): DomNode {
  const element = dom.createElement('div');
  element.setAttribute(kind === 'folder' ? 'data-vivarcdi-folder-id' : 'data-vivarcdi-link-id', id);
  element.setAttribute('data-vivarcdi-depth', String(depth));
  const top = section.children.length * ROW_HEIGHT;
  element.rect = { left: 0, right: 200, top, bottom: top + ROW_HEIGHT };
  section.append(element);
  return element;
}

function setup(): { targets: DropTargets; section: DomNode; header: DomNode; rows: Record<string, DomNode> } {
  const dom = new DomDocument();
  const section = dom.createElement('div');
  const header = dom.createElement('div');
  header.rect = { left: 0, right: 200, top: -40, bottom: -10 };
  const rows = {
    a: row(dom, section, ['folder', 'a', 0]),
    inner: row(dom, section, ['link', 'a1', 1]),
    b: row(dom, section, ['link', 'b', 0]),
    c: row(dom, section, ['folder', 'c', 0]),
  };
  section.rect = { left: 0, right: 200, top: 0, bottom: 4 * ROW_HEIGHT + 10 };
  return { targets: new DropTargets(() => asElement(section), () => asElement(header)), section, header, rows };
}

test('tells the header, a folder and the gaps from the position of the pointer', () => {
  const { targets } = setup();
  assert.deepEqual(targets.at(50, -20), { kind: 'header' });
  assert.deepEqual(targets.at(50, 15), { kind: 'folder', id: 'a' });
  assert.deepEqual(targets.at(50, 2), { kind: 'between', before: 'a', rowId: 'a', edge: 'before' });
  assert.deepEqual(targets.at(50, 28), { kind: 'between', before: 'b', rowId: 'a', edge: 'after' });
  assert.deepEqual(targets.at(50, 80), { kind: 'between', before: 'c', rowId: 'b', edge: 'after' });
  assert.deepEqual(targets.at(50, 4 * ROW_HEIGHT - 2), { kind: 'between', before: null, rowId: 'c', edge: 'after' });
});

test('a row inside a folder stands for the folder', () => {
  const { targets } = setup();
  assert.deepEqual(targets.at(50, 35), { kind: 'folder', id: 'a' });
  assert.deepEqual(targets.at(50, 55), { kind: 'folder', id: 'a' });
});

test('puts a tab released under the last row at the end', () => {
  const { targets } = setup();
  assert.deepEqual(targets.at(50, 4 * ROW_HEIGHT + 5), { kind: 'between', before: null, rowId: 'c', edge: 'after' });
});

test('finds nothing outside the header and the visible section', () => {
  const { targets, section } = setup();
  assert.equal(targets.at(500, 15), null);
  assert.equal(targets.at(50, 400), null);
  section.setAttribute('hidden', '');
  assert.equal(targets.at(50, 15), null);
});

test('marks the target under the pointer and removes the mark', () => {
  const { targets, header, rows } = setup();
  targets.mark({ kind: 'folder', id: 'a' });
  assert.equal(rows['a']?.getAttribute('data-vivarcdi-drop'), 'into');
  targets.mark({ kind: 'between', before: 'c', rowId: 'b', edge: 'after' });
  assert.equal(rows['a']?.hasAttribute('data-vivarcdi-drop'), false);
  assert.equal(rows['b']?.getAttribute('data-vivarcdi-drop'), 'after');
  targets.mark({ kind: 'header' });
  assert.equal(header.getAttribute('data-vivarcdi-drop'), 'into');
  targets.clear();
  assert.equal(header.hasAttribute('data-vivarcdi-drop'), false);
});
