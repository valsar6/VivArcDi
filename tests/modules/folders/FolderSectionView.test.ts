import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Row } from '../../../src/modules/folders/FolderRows.js';
import { FolderSectionView } from '../../../src/modules/folders/FolderSectionView.js';
import { LinkActivator } from '../../../src/modules/folders/LinkActivator.js';
import { OpenLinks } from '../../../src/modules/folders/OpenLinks.js';
import type { OpenTab } from '../../../src/modules/folders/OpenLinks.js';
import { DomDocument, asDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';
import { silentLogger } from '../reopen/fakes.js';
import { FolderTabs, immediateFrames } from './fakes.js';

const MAHJONG = 'https://mahjongsoul.game.yo-star.com/';
const KEY = 'mahjongsoul.game.yo-star.com';
const OPEN: OpenTab = { tabId: 2, title: 'Mahjong', key: KEY, favIconUrl: undefined, active: true, unloaded: false };

const linkRow = (tab: OpenTab | undefined): Row => ({ kind: 'link', id: '11', title: 'Mahjong Soul', url: MAHJONG, key: KEY, depth: 0, tab });

async function setup(tabs: FolderTabs): Promise<{ document: DomDocument; view: FolderSectionView; clicks: string[] }> {
  const document = new DomDocument();
  const open = new OpenLinks(tabs, () => undefined, silentLogger(), immediateFrames);
  const activator = new LinkActivator(tabs, open, silentLogger());
  const clicks: string[] = [];
  const view = new FolderSectionView(
    asDocument(document),
    {
      onFolder: (id): void => void clicks.push(`folder ${id}`),
      onLink: (link): void => void clicks.push(`link ${link.id}`),
      onClose: (tabId): void => void activator.close(tabId),
    },
    60,
  );
  return { document, view, clicks };
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
