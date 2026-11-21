import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WorkspaceSwitcher } from '../../../../src/modules/folders/editing/WorkspaceSwitcher.js';
import { silentLogger } from '../../reopen/fakes.js';
import { FolderTabs } from '../fakes.js';

test('switches to a workspace by activating the tab that moved there', async () => {
  const tabs = new FolderTabs([{ id: 4 }]);
  await new WorkspaceSwitcher(tabs, silentLogger()).to(4);
  assert.deepEqual(tabs.calls, [['activate', 4]]);
});

test('logs and stays where it is when the tab cannot be activated', async () => {
  const tabs = new FolderTabs([]);
  tabs.activate = (): Promise<chrome.tabs.Tab> => Promise.reject(new Error('gone'));
  await assert.doesNotReject(new WorkspaceSwitcher(tabs, silentLogger()).to(4));
});
