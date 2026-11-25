import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Row } from '../../../../src/modules/folders/view/FolderRows.js';
import { FolderSectionView } from '../../../../src/modules/folders/view/FolderSectionView.js';
import { ROWS_DRAWN_EVENT } from '../../../../src/shared/links/InPlaceEditor.js';
import type { OpenTab } from '../../../../src/shared/links/OpenLinks.js';
import { DomDocument, asDocument } from '../../../core/dom.js';
import type { DomNode } from '../../../core/dom.js';
import { ManualTimers } from '../../copyurl/fakes.js';
import { FolderTabs } from '../fakes.js';

const MAHJONG = 'https://mahjongsoul.game.yo-star.com/';
const KEY = 'mahjongsoul.game.yo-star.com';
const OPEN: OpenTab = { tabId: 2, title: 'Mahjong', key: KEY, favIconUrl: undefined, active: true, unloaded: false };

const linkRow = (tab: OpenTab | undefined): Row => ({ kind: 'link', id: '11', title: 'Mahjong Soul', url: MAHJONG, key: KEY, depth: 0, tab });

interface CloseCall {
  tabIds: number[];
  folderId: string | undefined;
}

async function setup(_tabs: FolderTabs): Promise<{ document: DomDocument; view: FolderSectionView; clicks: string[]; closes: CloseCall[]; timers: ManualTimers }> {
  const document = new DomDocument();
  const clicks: string[] = [];
  const closes: CloseCall[] = [];
  const timers = new ManualTimers();
  const view = new FolderSectionView(
    asDocument(document),
    {
      onFolder: (id): void => void clicks.push(`folder ${id}`),
      onLink: (link): void => void clicks.push(`link ${link.id}`),
      onClose: (tabIds, folderId): void => void closes.push({ tabIds, folderId }),
      onRename: (id, name): void => void clicks.push(`rename ${id} ${name}`),
      onMenu: (id, x, y): void => void clicks.push(`menu ${id} ${x} ${y}`),
    },
    timers,
  );
  return { document, view, clicks, closes, timers };
}

const rowOf = (view: FolderSectionView): DomNode => (view.element as unknown as DomNode).children[0] as DomNode;
const minusOf = (row: DomNode): DomNode | undefined => row.children.find((child) => child.hasAttribute('data-vivarcdi-link-minus'));

const pressMinus = (node: DomNode, type: string): void =>
  node.bubble({
    type,
    target: node,
    preventDefault: (): void => undefined,
    stopPropagation: (): void => undefined,
    stopImmediatePropagation: (): void => undefined,
  } as unknown as Event);

test('shows the link row minus only while the row is hovered', async () => {
  const { view } = await setup(new FolderTabs());
  view.render([linkRow(OPEN)]);
  const button = minusOf(rowOf(view));
  assert.ok(button);
  assert.equal(button.getAttribute('aria-label'), 'Close tab');
  view.render([linkRow(undefined)]);
  assert.equal(minusOf(rowOf(view)), undefined);
});

test('indents every row of an open tab one step further than a closed link row', async () => {
  const { view } = await setup(new FolderTabs());
  const open = { ...linkRow(OPEN), id: '21' };
  const closed = { ...linkRow(undefined), id: '22' };
  const belowFolder = { ...linkRow(OPEN), id: '23', depth: 1 };
  view.render([open, closed, belowFolder]);
  const rows = (view.element as unknown as DomNode).children;
  assert.equal(rows[0]?.properties.get('--vivarcdi-depth'), '1');
  assert.equal(rows[1]?.properties.get('--vivarcdi-depth'), '0');
  assert.equal(rows[2]?.properties.get('--vivarcdi-depth'), '2');
  assert.equal(rows[0]?.getAttribute('data-vivarcdi-depth'), '0');
  assert.equal(rows[2]?.getAttribute('data-vivarcdi-depth'), '1');
});

test('closes a link tab from its minus', async () => {
  const tabs = new FolderTabs([{ id: 2, url: MAHJONG }]);
  const { view, clicks, closes } = await setup(tabs);
  view.render([linkRow(OPEN)]);
  const button = minusOf(rowOf(view));
  assert.ok(button);
  pressMinus(button, 'pointerdown');
  pressMinus(button, 'mousedown');
  pressMinus(button, 'click');
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(closes, [{ tabIds: [2], folderId: undefined }]);
  assert.deepEqual(tabs.actions(), []);
  assert.deepEqual(clicks, []);
});

test('tells an open field that the rows were drawn again', async () => {
  const { document, view } = await setup(new FolderTabs());
  let drawn = 0;
  document.addEventListener(ROWS_DRAWN_EVENT, () => void (drawn += 1));
  view.render([linkRow(undefined)]);
  assert.equal(drawn, 1);
});

test('a click on the row of a link opens it and a link without a tab has no close button', async () => {
  const { view, clicks } = await setup(new FolderTabs());
  view.render([linkRow(undefined)]);
  assert.equal(minusOf(rowOf(view)), undefined);
  rowOf(view).click();
  assert.deepEqual(clicks, ['link 11']);
});

test('marks the row of an open link as active or unloaded', async () => {
  const { view } = await setup(new FolderTabs());
  view.render([linkRow(OPEN)]);
  assert.ok(rowOf(view).hasAttribute('data-vivarcdi-link-open'));
  assert.ok(rowOf(view).hasAttribute('data-vivarcdi-link-active'));
  assert.equal(rowOf(view).hasAttribute('data-vivarcdi-link-unloaded'), false);
  view.render([linkRow({ ...OPEN, active: false, unloaded: true })]);
  assert.equal(rowOf(view).hasAttribute('data-vivarcdi-link-active'), false);
  assert.ok(rowOf(view).hasAttribute('data-vivarcdi-link-unloaded'));
});

const folderRow = (id = '10', title = 'Hobbies'): Row => ({ kind: 'folder', id, title, depth: 0, open: false });

test('closes the open link tabs of a folder from its minus and closes the folder', async () => {
  const { view, clicks, closes } = await setup(new FolderTabs());
  const nested = (tabId: number): Row => ({ ...linkRow({ ...OPEN, tabId }), depth: 1 });
  view.render([folderRow(), nested(3), nested(4), folderRow('12', 'Streaming')]);
  const button = rowOf(view).children.find((child) => child.hasAttribute('data-vivarcdi-folder-minus'));
  assert.ok(button);
  pressMinus(button, 'click');
  assert.deepEqual(closes, [{ tabIds: [3, 4], folderId: '10' }]);
  assert.deepEqual(clicks, []);
});

test('does not drag or open a Favorites row from its minus', async () => {
  const tabs = new FolderTabs([{ id: 2, url: MAHJONG }]);
  const { view, clicks } = await setup(tabs);
  view.render([folderRow(), { ...linkRow(OPEN), depth: 1 }]);
  const rows = (view.element as unknown as DomNode).children;
  const folderMinus = rows[0]?.children.find((child) => child.hasAttribute('data-vivarcdi-folder-minus'));
  const linkMinus = rows[1]?.children.find((child) => child.hasAttribute('data-vivarcdi-link-minus'));
  assert.ok(folderMinus);
  assert.ok(linkMinus);
  [folderMinus, linkMinus].forEach((button) => ['pointerdown', 'mousedown', 'click'].forEach((type) => pressMinus(button, type)));
  assert.deepEqual(clicks, []);
  assert.deepEqual(tabs.actions(), []);
});

test('labels the row minuses for closing tabs', async () => {
  const { view } = await setup(new FolderTabs());
  view.render([folderRow(), { ...linkRow(OPEN), depth: 1 }]);
  const rows = (view.element as unknown as DomNode).children;
  const folderMinus = rows[0]?.children.find((child) => child.hasAttribute('data-vivarcdi-folder-minus'));
  const linkMinus = rows[1]?.children.find((child) => child.hasAttribute('data-vivarcdi-link-minus'));
  assert.equal(folderMinus?.getAttribute('aria-label'), 'Close tabs');
  assert.equal(linkMinus?.getAttribute('aria-label'), 'Close tab');
  assert.equal(folderMinus?.getAttribute('title'), null);
  assert.equal(linkMinus?.getAttribute('title'), null);
});

const inputOf = (view: FolderSectionView): DomNode | undefined => rowOf(view).children.find((child) => child.hasAttribute('data-vivarcdi-edit'));
const press = (input: DomNode | undefined, key: string): void => input?.bubble({ type: 'keydown', key, stopPropagation: (): void => undefined, preventDefault: (): void => undefined } as unknown as Event);

function doubleClick(row: DomNode): void {
  row.click();
  row.click();
  row.bubble({ type: 'dblclick', target: row } as unknown as Event);
}

test('edits the name on double click', async () => {
  const { view, clicks, timers } = await setup(new FolderTabs());
  view.render([folderRow()]);
  doubleClick(rowOf(view));
  timers.fire();
  const input = inputOf(view);
  assert.ok(input);
  assert.equal(input.value, 'Hobbies');
  assert.equal(input.focused, true);
  assert.equal(input.selected, true);
  assert.deepEqual(clicks, []);
});

test('a single click on a folder waits for the double click time and then toggles it', async () => {
  const { view, clicks, timers } = await setup(new FolderTabs());
  view.render([folderRow()]);
  rowOf(view).click();
  assert.deepEqual(clicks, []);
  assert.equal([...timers.pending.values()][0]?.delayMs, 250);
  timers.fire();
  assert.deepEqual(clicks, ['folder 10']);
});

test('reports the typed name on Enter and on blur and the previous name never changes on Escape', async () => {
  const { view, clicks } = await setup(new FolderTabs());
  view.render([folderRow()]);
  view.edit('10');
  const typed = inputOf(view);
  assert.ok(typed);
  typed.value = '  MyFolder ';
  press(typed, 'Enter');
  assert.deepEqual(clicks, ['rename 10 MyFolder']);
  assert.equal(inputOf(view), undefined);
  assert.equal(rowOf(view).children[1]?.textContent, 'MyFolder');

  view.edit('10');
  const blurred = inputOf(view);
  assert.ok(blurred);
  blurred.value = 'Other';
  blurred.bubble({ type: 'blur' } as unknown as Event);
  assert.deepEqual(clicks.slice(1), ['rename 10 Other']);

  view.edit('10');
  const escaped = inputOf(view);
  assert.ok(escaped);
  escaped.value = 'Never';
  press(escaped, 'Escape');
  escaped.bubble({ type: 'blur' } as unknown as Event);
  assert.equal(clicks.length, 2);
  assert.equal(rowOf(view).children[1]?.textContent, 'Other');
});

test('keeps the name when the text is empty or unchanged', async () => {
  const { view, clicks } = await setup(new FolderTabs());
  view.render([folderRow()]);
  for (const text of ['   ', 'Hobbies', '']) {
    view.edit('10');
    const input = inputOf(view);
    assert.ok(input);
    input.value = text;
    press(input, 'Enter');
  }
  assert.deepEqual(clicks, []);
  assert.equal(rowOf(view).children[1]?.textContent, 'Hobbies');
});

test('keeps the typed text and the focus when the rows are drawn again while editing', async () => {
  const { view } = await setup(new FolderTabs());
  view.render([folderRow()]);
  view.edit('10');
  const first = inputOf(view);
  assert.ok(first);
  first.value = 'Typing';
  view.render([folderRow()]);
  const second = inputOf(view);
  assert.ok(second);
  assert.notEqual(second, first);
  assert.equal(second.value, 'Typing');
  assert.equal(second.focused, true);
  assert.equal(second.caret, 6);
  first.bubble({ type: 'blur' } as unknown as Event);
  assert.ok(inputOf(view), 'the blur of a removed field does not end the edit');
});

test('a click inside the field neither toggles nor ends the edit, and the edit stops when the folder is gone', async () => {
  const { view, clicks, timers } = await setup(new FolderTabs());
  view.render([folderRow()]);
  view.edit('10');
  inputOf(view)?.click();
  timers.fire();
  assert.deepEqual(clicks, []);
  assert.ok(inputOf(view));
  view.render([folderRow('20', 'Music')]);
  assert.equal(inputOf(view), undefined);
});

test('edits a folder that is drawn after the request, but not one that never comes', async () => {
  const { view, timers } = await setup(new FolderTabs());
  view.render([]);
  view.edit('10');
  view.render([folderRow('10', 'Untitled')]);
  assert.equal(inputOf(view)?.value, 'Untitled');
  assert.equal(inputOf(view)?.selected, true);
  press(inputOf(view), 'Escape');
  view.edit('30');
  timers.fire();
  view.render([folderRow('30', 'Late')]);
  assert.equal(inputOf(view), undefined);
});

const openFolder = (open: boolean): Row => ({ kind: 'folder', id: '5', title: 'Music', depth: 0, open });
const childRow: Row = { kind: 'link', id: '12', title: 'Guitar', url: MAHJONG, key: KEY, depth: 1, tab: undefined };
const childrenOf = (view: FolderSectionView): DomNode[] => (view.element as unknown as DomNode).children;

test('marks the folder row open and closed for its icon', async () => {
  const { view } = await setup(new FolderTabs());
  view.render([openFolder(false)]);
  assert.equal(rowOf(view).hasAttribute('data-vivarcdi-open'), false);
  view.render([openFolder(true)]);
  assert.equal(rowOf(view).hasAttribute('data-vivarcdi-open'), true);
});

test('animates the rows of a folder opened and closed by a click', async () => {
  const { view, timers } = await setup(new FolderTabs());
  view.render([openFolder(false)]);
  rowOf(view).click();
  timers.fire();
  view.render([openFolder(true), childRow]);
  assert.equal(childrenOf(view)[1]?.hasAttribute('data-vivarcdi-entering'), true);
  childrenOf(view)[0]?.click();
  timers.fire();
  view.render([openFolder(false)]);
  assert.equal(childrenOf(view).length, 2);
  assert.equal(childrenOf(view)[1]?.hasAttribute('data-vivarcdi-leaving'), true);
  timers.fire();
  assert.equal(childrenOf(view).length, 1);
});

test('draws rows at once when no folder was clicked', async () => {
  const { view } = await setup(new FolderTabs());
  view.render([openFolder(false)]);
  view.render([openFolder(true), childRow]);
  assert.equal(childrenOf(view)[1]?.hasAttribute('data-vivarcdi-entering'), false);
  view.render([openFolder(false)]);
  assert.equal(childrenOf(view).length, 1);
});
