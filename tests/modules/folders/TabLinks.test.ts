import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TabLinks } from '../../../src/modules/folders/TabLinks.js';
import { LinkingTabs } from '../favorites/linked.js';

const linkedTo = (bookmarkId: string): string => JSON.stringify({ workspaceId: 7, group: 'g', vivarcdi: { bookmarkId, lastActive: 5 } });

test('links a tab to a bookmark keeping what Vivaldi stored', async () => {
  const tabs = new LinkingTabs([{ id: 2, vivExtData: JSON.stringify({ workspaceId: 7, vivarcdi: { lastActive: 5 } }) }]);
  await new TabLinks(tabs).link(2, '11');
  assert.deepEqual(tabs.extData(2), { workspaceId: 7, vivarcdi: { bookmarkId: '11', lastActive: 5 } });
});

test('unlinks the tab of a removed bookmark and leaves the others linked', async () => {
  const tabs = new LinkingTabs([
    { id: 2, vivExtData: linkedTo('11') },
    { id: 3, vivExtData: linkedTo('13') },
    { id: 4, vivExtData: JSON.stringify({ workspaceId: 7 }) },
  ]);
  await new TabLinks(tabs).unlinkExcept(new Set(['13']));
  assert.deepEqual(tabs.extData(2), { workspaceId: 7, group: 'g', vivarcdi: { lastActive: 5 } });
  assert.deepEqual(tabs.extData(3), { workspaceId: 7, group: 'g', vivarcdi: { bookmarkId: '13', lastActive: 5 } });
  assert.deepEqual(tabs.actions().filter(([name]) => name === 'update').map(([, id]) => id), [2]);
});
