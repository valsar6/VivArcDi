import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { LinkLabel } from '../../../../src/core/browser/LinkLabels.js';
import { FolderRowElement, ICON_CLASS } from '../../../../src/modules/folders/view/FolderRowElement.js';
import { FolderRows } from '../../../../src/modules/folders/view/FolderRows.js';
import type { LinkRow, RowSources } from '../../../../src/modules/folders/view/FolderRows.js';
import { FolderTree } from '../../../../src/shared/links/FolderTree.js';
import type { LinkRef, OpenTab } from '../../../../src/shared/links/OpenLinks.js';
import { asDocument } from '../../../core/dom.js';
import type { DomNode } from '../../../core/dom.js';
import { SvgDocument } from '../../../shared/icons/fakes.js';
import { link } from '../fakes.js';

const URL = 'https://mahjongsoul.game.yo-star.com/';
const entries = FolderTree.build([link('11', 'Mahjong Soul', URL)], 3);

const noTab = (): undefined => undefined;
const awayTab = (): OpenTab => ({ tabId: 1, title: 'Log in', key: 'id.atlassian.com/login', favIconUrl: undefined, active: false, unloaded: false });

const rowOf = (labels: Record<string, LinkLabel>, tabFor: (link: LinkRef) => OpenTab | undefined = noTab): LinkRow => {
  const sources: RowSources = { isOpen: () => true, tabFor, labels: (id) => labels[id] };
  const [row] = FolderRows.build(entries, sources);
  assert.equal(row?.kind, 'link');
  return row;
};

const elementOf = (row: LinkRow): DomNode => {
  const document = new SvgDocument();
  const editor = { isEditing: (): boolean => false, field: (): HTMLElement => asDocument(document).createElement('input') };
  return new FolderRowElement(asDocument(document), editor).create(row) as unknown as DomNode;
};

const titleOf = (element: DomNode): string | undefined => element.children[1]?.textContent;

test('shows the chosen symbol of a saved tab', () => {
  const withSymbol = elementOf(rowOf({ '11': { name: 'Game', icon: { symbol: 'star' } } }));
  const [icon] = withSymbol.children;
  assert.equal(icon?.tagName, 'SPAN');
  assert.equal(icon?.className, ICON_CLASS);
  assert.equal(icon?.children[0]?.tagName, 'SVG');
  assert.equal(titleOf(withSymbol), 'Game');

  const without = elementOf(rowOf({}));
  assert.equal(without.children[0]?.tagName, 'IMG');
  assert.equal(titleOf(without), 'Mahjong Soul');
});

test('shows the emoji of a saved tab as text', () => {
  const [icon] = elementOf(rowOf({ '11': { icon: { emoji: '🎮' } } })).children;
  assert.deepEqual([icon?.tagName, icon?.textContent], ['SPAN', '🎮']);
});

test('the name of a label wins over the title of a tab that navigated away', () => {
  const element = elementOf(rowOf({ '11': { name: 'Game' } }, awayTab));
  assert.equal(titleOf(element), 'Game');
  assert.equal(rowOf({}, awayTab).title, 'Log in');
});

test('an unknown symbol draws the favicon', () => {
  const [icon] = elementOf(rowOf({ '11': { icon: { symbol: 'nothing' } } })).children;
  assert.equal(icon?.tagName, 'IMG');
});

test('a stored favicon is drawn instead of the one of the service', () => {
  const favicon = 'https://mahjongsoul.game.yo-star.com/new.png';
  const [icon] = elementOf(rowOf({ '11': { favicon } })).children;
  assert.equal(icon?.getAttribute('src'), favicon);
});

test('the icon of a label wins over its favicon', () => {
  const [icon] = elementOf(rowOf({ '11': { icon: { emoji: '🎮' }, favicon: 'https://x.example/a.png' } })).children;
  assert.equal(icon?.textContent, '🎮');
});
