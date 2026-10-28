import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WorkspaceTabs } from '../../src/core/WorkspaceTabs.js';
import { FolderTabs } from '../modules/folders/fakes.js';
import { silentLogger } from '../modules/reopen/fakes.js';

const URL = 'https://example.com/';

test('opens an active tab and puts it in the given workspace', async () => {
  const tabs = new FolderTabs();
  const created = await new WorkspaceTabs(tabs, silentLogger()).open(URL, '7');
  assert.equal(created.id, 100);
  assert.deepEqual(tabs.actions(), [
    ['create', { url: URL, active: true }],
    ['update', 100, { vivExtData: JSON.stringify({ workspaceId: 7 }) }],
  ]);
});

test('leaves a tab without a workspace where Vivaldi puts it', async () => {
  const tabs = new FolderTabs();
  await new WorkspaceTabs(tabs, silentLogger()).open(URL, null);
  assert.deepEqual(tabs.actions(), [['create', { url: URL, active: true }]]);
});

test('keeps the new tab when the workspace cannot be written', async () => {
  const tabs = new FolderTabs();
  tabs.failing.add('update');
  const created = await new WorkspaceTabs(tabs, silentLogger()).open(URL, 'work');
  assert.equal(created.id, 100);
  assert.deepEqual(tabs.actions()[1], ['update', 100, { vivExtData: JSON.stringify({ workspaceId: 'work' }) }]);
});
