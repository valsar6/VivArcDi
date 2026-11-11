import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ContextMenu, MENU_ATTRIBUTE } from '../../src/core/ContextMenu.js';
import { asDocument, DomDocument } from './dom.js';
import type { DomNode } from './dom.js';

interface Setup {
  dom: DomDocument;
  menu: ContextMenu;
  ran: string[];
  element: () => DomNode | undefined;
  rows: () => DomNode[];
}

function setup(): Setup {
  const dom = new DomDocument();
  dom.defaultView = { innerWidth: 400, innerHeight: 300 };
  const ran: string[] = [];
  const menu = new ContextMenu({ document: asDocument(dom), parent: (): Element => dom.parent as unknown as Element });
  menu.open(
    [
      { label: 'First', run: (): void => void ran.push('first') },
      { label: 'Second', run: (): void => void ran.push('second') },
    ],
    50,
    60,
  );
  const element = (): DomNode | undefined => dom.created.findLast((node) => node.hasAttribute(MENU_ATTRIBUTE) && node.parentElement !== null);
  return { dom, menu, ran, element, rows: (): DomNode[] => element()?.children ?? [] };
}

const press = (dom: DomDocument, target: unknown): void => dom.emit('mousedown', { button: 0, target });

test('draws a row for each item at the pointer', () => {
  const { element, rows } = setup();
  assert.deepEqual(rows().map((row) => row.textContent), ['First', 'Second']);
  assert.equal(element()?.properties.get('left'), '50px');
  assert.equal(element()?.properties.get('top'), '60px');
});

test('keeps the menu inside the window', () => {
  const { dom, menu, element } = setup();
  menu.open([{ label: 'Only', run: (): void => undefined }], 900, 900);
  assert.equal(element()?.properties.get('left'), '396px');
  assert.equal(element()?.properties.get('top'), '296px');
  assert.equal(dom.created.filter((node) => node.hasAttribute(MENU_ATTRIBUTE) && node.parentElement !== null).length, 1);
});

test('runs an item and closes the menu after it', () => {
  const { element, rows, ran } = setup();
  rows()[1]?.click();
  assert.deepEqual(ran, ['second']);
  assert.equal(element(), undefined);
});

test('closes the menu without a command', () => {
  const first = setup();
  first.dom.emit('keydown', { key: 'Enter', preventDefault: (): void => undefined, stopPropagation: (): void => undefined });
  assert.notEqual(first.element(), undefined);
  first.dom.emit('keydown', { key: 'Escape', preventDefault: (): void => undefined, stopPropagation: (): void => undefined });
  assert.equal(first.element(), undefined);
  assert.deepEqual(first.ran, []);

  const second = setup();
  press(second.dom, second.rows()[0]);
  assert.notEqual(second.element(), undefined);
  press(second.dom, second.dom.createElement('div'));
  assert.equal(second.element(), undefined);
  assert.deepEqual(second.ran, []);
});

test('stops listening once it is closed', () => {
  const { dom, menu } = setup();
  menu.close();
  assert.equal([...dom.listeners.values()].flat().length, 0);
});
