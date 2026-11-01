import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Row } from '../../../src/modules/folders/FolderRows.js';
import { FolderSectionView } from '../../../src/modules/folders/FolderSectionView.js';
import { LinkActivator } from '../../../src/modules/folders/LinkActivator.js';
import { OpenLinks } from '../../../src/modules/folders/OpenLinks.js';
import type { OpenTab } from '../../../src/modules/folders/OpenLinks.js';
import { DomDocument, asDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';
import { ManualTimers } from '../copyurl/fakes.js';
import { silentLogger } from '../reopen/fakes.js';
import { FolderTabs, immediateFrames } from './fakes.js';

const MAHJONG = 'https://mahjongsoul.game.yo-star.com/';
const KEY = 'mahjongsoul.game.yo-star.com';
const OPEN: OpenTab = { tabId: 2, title: 'Mahjong', key: KEY, favIconUrl: undefined, active: true, unloaded: false };

const linkRow = (tab: OpenTab | undefined): Row => ({ kind: 'link', id: '11', title: 'Mahjong Soul', url: MAHJONG, key: KEY, depth: 0, tab });

async function setup(tabs: FolderTabs): Promise<{ document: DomDocument; view: FolderSectionView; clicks: string[]; timers: ManualTimers }> {
  const document = new DomDocument();
  const open = new OpenLinks(tabs, () => undefined, silentLogger(), immediateFrames);
  const activator = new LinkActivator(tabs, open, silentLogger());
  const clicks: string[] = [];
  const timers = new ManualTimers();
  const view = new FolderSectionView(
    asDocument(document),
    {
      onFolder: (id): void => void clicks.push(`folder ${id}`),
      onLink: (link): void => void clicks.push(`link ${link.id}`),
      onClose: (tabId): void => void activator.close(tabId),
      onRename: (id, name): void => void clicks.push(`rename ${id} ${name}`),
    },
    60,
    timers,
  );
  return { document, view, clicks, timers };
}

const rowOf = (view: FolderSectionView): DomNode => (view.element as unknown as DomNode).children[0] as DomNode;
const closeButtonOf = (row: DomNode): DomNode | undefined => row.children.find((child) => child.hasAttribute('data-vivarcdi-link-close'));

test('closes the tab of a link from its row', async () => {
  const tabs = new FolderTabs([{ id: 2, url: MAHJONG }]);
  const { view, clicks } = await setup(tabs);
  view.render([linkRow(OPEN)]);
  const button = closeButtonOf(rowOf(view));
  assert.ok(button);
  button.click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(tabs.actions(), [['remove', 2]]);
  assert.deepEqual(clicks, []);
});

test('a click on the row of a link opens it and a link without a tab has no close button', async () => {
  const { view, clicks } = await setup(new FolderTabs());
  view.render([linkRow(undefined)]);
  assert.equal(closeButtonOf(rowOf(view)), undefined);
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
