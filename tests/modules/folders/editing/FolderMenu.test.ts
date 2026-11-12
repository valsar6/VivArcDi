import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { MenuItem, SubmenuItem } from '../../../../src/core/ContextMenu.js';
import { FolderMenu } from '../../../../src/modules/folders/editing/FolderMenu.js';
import { FolderMenuItems } from '../../../../src/modules/folders/editing/FolderMenuItems.js';
import { asDocument, DomDocument } from '../../../core/dom.js';

function setup(): { dom: DomDocument; opened: MenuItem[][]; calls: string[] } {
  const dom = new DomDocument();
  const opened: MenuItem[][] = [];
  const calls: string[] = [];
  const items = new FolderMenuItems({
    rename: (id): void => void calls.push(`rename ${id}`),
    duplicate: (id): void => void calls.push(`duplicate ${id}`),
    moveTo: (): SubmenuItem => ({ label: 'Move to', items: [] }),
    remove: (id): void => void calls.push(`remove ${id}`),
  });
  new FolderMenu({ document: asDocument(dom), menu: { open: (list): void => void opened.push(list), close: (): void => undefined }, items }).attach();
  return { dom, opened, calls };
}

const rightClick = (dom: DomDocument, target: unknown): { prevented: number; stopped: number } => {
  const seen = { prevented: 0, stopped: 0 };
  dom.emit('contextmenu', { target, clientX: 7, clientY: 9, preventDefault: (): number => (seen.prevented += 1), stopPropagation: (): number => (seen.stopped += 1) });
  return seen;
};

const folderRow = (dom: DomDocument, live = false): unknown => {
  const row = dom.createElement('div');
  row.setAttribute('data-vivarcdi-folder-id', '12');
  if (live) {
    row.setAttribute('data-vivarcdi-live-folder', '');
  }
  return row;
};

const shape = (items: MenuItem[]): string[] => items.map((item) => ('separator' in item ? '---' : item.label));

test('opens the folder menu on a right click of a folder row', () => {
  const { dom, opened, calls } = setup();
  const seen = rightClick(dom, folderRow(dom));
  assert.deepEqual(seen, { prevented: 1, stopped: 1 });
  assert.deepEqual(shape(opened[0] ?? []), ['Rename…', '---', 'Duplicate', 'Move to', '---', 'Delete']);
  opened[0]?.forEach((item) => ('run' in item ? item.run() : undefined));
  assert.deepEqual(calls, ['rename 12', 'duplicate 12', 'remove 12']);
});

test('leaves live folder rows to their own menu', () => {
  const { dom, opened } = setup();
  assert.equal(rightClick(dom, folderRow(dom, true)).prevented, 0);
  assert.equal(rightClick(dom, dom.createElement('div')).prevented, 0);
  assert.equal(rightClick(dom, null).prevented, 0);
  assert.deepEqual(opened, []);
});

test('starts editing the name from the folder menu', () => {
  const edited: string[] = [];
  const items = new FolderMenuItems({ rename: (id): void => void edited.push(id), duplicate: (): void => undefined, moveTo: (): null => null, remove: (): void => undefined }).for('12');
  const [rename] = items;
  assert.ok(rename !== undefined && 'run' in rename);
  rename.run();
  assert.deepEqual(edited, ['12']);
});

test('stops listening on detach', () => {
  const dom = new DomDocument();
  const menu = new FolderMenu({ document: asDocument(dom), menu: { open: (): void => undefined, close: (): void => undefined }, items: { for: (): MenuItem[] => [] } });
  menu.attach();
  menu.detach();
  assert.equal([...dom.listeners.values()].flat().length, 0);
});

test('leaves Move to out when there is no workspace', () => {
  const items = new FolderMenuItems({ rename: (): void => undefined, duplicate: (): void => undefined, moveTo: (): null => null, remove: (): void => undefined });
  assert.deepEqual(shape(items.for('12')), ['Rename…', '---', 'Duplicate', '---', 'Delete']);
});
