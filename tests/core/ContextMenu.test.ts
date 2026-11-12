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

function nested(): Setup {
  const dom = new DomDocument();
  dom.defaultView = { innerWidth: 400, innerHeight: 300 };
  const ran: string[] = [];
  const menu = new ContextMenu({ document: asDocument(dom), parent: (): Element => dom.parent as unknown as Element });
  menu.open(
    [
      { label: 'Plain', run: (): void => void ran.push('plain') },
      {
        label: 'Filters',
        items: [
          { label: 'On', checked: true, run: (): void => void ran.push('on') },
          { label: 'Off', checked: false, run: (): void => void ran.push('off') },
        ],
      },
    ],
    50,
    60,
  );
  const open = (): DomNode[] => dom.created.filter((node) => node.hasAttribute(MENU_ATTRIBUTE) && node.parentElement !== null);
  const element = (): DomNode | undefined => open().at(-1);
  return { dom, menu, ran, element, rows: (): DomNode[] => open()[0]?.children ?? [] };
}

const menusOpen = (dom: DomDocument): number => dom.created.filter((node) => node.hasAttribute(MENU_ATTRIBUTE) && node.parentElement !== null).length;

const checkItems = (): { on: DomNode | undefined; off: DomNode | undefined } => {
  const { dom, rows } = nested();
  rows()[1]?.bubble({ type: 'mouseenter', target: rows()[1] } as unknown as Event);
  const [on, off] = dom.created.findLast((node) => node.hasAttribute(MENU_ATTRIBUTE))?.children ?? [];
  return { on, off };
};

test('draws a check mark on a check item that is on', () => {
  const { on } = checkItems();
  assert.equal(on?.getAttribute('role'), 'menuitemcheckbox');
  assert.equal(on?.getAttribute('aria-checked'), 'true');
  assert.equal(on?.hasAttribute('data-vivarcdi-checked'), true);
});

test('draws no check mark on a check item that is off', () => {
  const { off } = checkItems();
  assert.equal(off?.getAttribute('role'), 'menuitemcheckbox');
  assert.equal(off?.getAttribute('aria-checked'), 'false');
  assert.equal(off?.hasAttribute('data-vivarcdi-checked'), false);
});

test('a plain item has no check mark', () => {
  const { rows } = nested();
  assert.equal(rows()[0]?.getAttribute('role'), 'menuitem');
  assert.equal(rows()[0]?.hasAttribute('data-vivarcdi-checked'), false);
});

test('opens a submenu beside its row on hover and closes it on another row', () => {
  const { dom, rows } = nested();
  assert.equal(rows()[1]?.getAttribute('aria-haspopup'), 'menu');
  rows()[1]?.bubble({ type: 'mouseenter', target: rows()[1] } as unknown as Event);
  assert.equal(menusOpen(dom), 2);
  rows()[0]?.bubble({ type: 'mouseenter', target: rows()[0] } as unknown as Event);
  assert.equal(menusOpen(dom), 1);
});

test('opens a submenu on a click, once', () => {
  const { dom, rows } = nested();
  rows()[1]?.click();
  rows()[1]?.click();
  assert.equal(menusOpen(dom), 2);
});

test('runs an item of a submenu and closes every level', () => {
  const { dom, rows, ran } = nested();
  rows()[1]?.click();
  const submenu = dom.created.findLast((node) => node.hasAttribute(MENU_ATTRIBUTE));
  submenu?.children[1]?.click();
  assert.deepEqual(ran, ['off']);
  assert.equal(menusOpen(dom), 0);
});

test('a click inside a submenu does not close the menu', () => {
  const { dom, rows } = nested();
  rows()[1]?.click();
  const submenu = dom.created.findLast((node) => node.hasAttribute(MENU_ATTRIBUTE));
  press(dom, submenu?.children[0]);
  assert.equal(menusOpen(dom), 2);
  press(dom, dom.createElement('div'));
  assert.equal(menusOpen(dom), 0);
});

test('closes the submenu with the menu on Escape', () => {
  const { dom, rows } = nested();
  rows()[1]?.click();
  dom.emit('keydown', { key: 'Escape', preventDefault: (): void => undefined, stopPropagation: (): void => undefined });
  assert.equal(menusOpen(dom), 0);
});

test('places a submenu at the right of its row, level with it', () => {
  const { dom, rows } = nested();
  const row = rows()[1] as DomNode;
  row.rect = { left: 60, right: 160, top: 80, bottom: 108 };
  row.click();
  const submenu = dom.created.findLast((node) => node.hasAttribute(MENU_ATTRIBUTE));
  assert.equal(submenu?.properties.get('left'), '160px');
  assert.equal(submenu?.properties.get('top'), '80px');
});
