import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LinkedTab } from '../../../../src/modules/folders/editing/LinkedTab.js';
import { FolderTabs } from '../fakes.js';

const linkedTo = (bookmarkId: string, workspaceId?: number): string => JSON.stringify({ ...(workspaceId === undefined ? {} : { workspaceId }), vivarcdi: { bookmarkId } });

test('picks the most recent tab of the row in the active workspace', async () => {
  const tabs = new FolderTabs([
    { id: 1, active: true, vivExtData: JSON.stringify({ workspaceId: 7 }) },
    { id: 2, lastAccessed: 10, vivExtData: linkedTo('11', 7) },
    { id: 3, lastAccessed: 30, vivExtData: linkedTo('11', 7) },
    { id: 4, lastAccessed: 99, vivExtData: linkedTo('11', 8) },
    { id: 5, lastAccessed: 50, vivExtData: linkedTo('12', 7) },
  ]);
  assert.equal((await new LinkedTab(tabs).of('11'))?.id, 3);
});

test('ignores the tabs of another window', async () => {
  const tabs = new FolderTabs([
    { id: 1, active: true },
    { id: 2, windowId: 2, vivExtData: linkedTo('11') },
  ]);
  assert.equal(await new LinkedTab(tabs).of('11'), undefined);
});

test('finds no tab for a row that is not open', async () => {
  const tabs = new FolderTabs([{ id: 1, active: true }]);
  assert.equal(await new LinkedTab(tabs).of('11'), undefined);
});
