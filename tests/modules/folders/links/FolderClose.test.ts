import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OPEN_FOLDERS_STORAGE_KEY, OpenFolders } from '../../../../src/modules/folders/tree/OpenFolders.js';
import { FolderClose } from '../../../../src/modules/folders/links/FolderClose.js';
import { FolderCloser, type CloserTabs } from '../../../../src/modules/folders/links/FolderCloser.js';
import { MemoryStorage, silentLogger } from '../../reopen/fakes.js';

const keyOf = (workspaceId: string | null): string =>
  workspaceId === null ? OPEN_FOLDERS_STORAGE_KEY : `${OPEN_FOLDERS_STORAGE_KEY}.${workspaceId}`;

test('saves the folder state in the workspace active at press time', async () => {
  const storage = new MemoryStorage();
  const folders = new OpenFolders(storage, silentLogger());
  folders.useWorkspace('8');
  folders.toggle('10');
  folders.useWorkspace('7');
  folders.toggle('10');

  const tabs: CloserTabs = {
    remove: async (): Promise<void> => {
      folders.useWorkspace('8');
    },
  };
  const close = new FolderClose(new FolderCloser(tabs, silentLogger()), folders, (): void => undefined);
  await close.apply([3], '10', '7');

  assert.equal(storage.getItem(keyOf('7')), '[]');
  assert.equal(storage.getItem(keyOf('8')), '["10"]');
  assert.equal(storage.getItem(OPEN_FOLDERS_STORAGE_KEY), null);
  assert.equal(folders.has('10'), true);
});
