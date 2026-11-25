import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActiveWorkspace } from '../../../../src/core/workspaces/ActiveWorkspace.js';
import { OPEN_FOLDERS_STORAGE_KEY, OpenFolders } from '../../../../src/modules/folders/tree/OpenFolders.js';
import { FolderClose } from '../../../../src/modules/folders/links/FolderClose.js';
import { FolderCloser, type CloserTabs } from '../../../../src/modules/folders/links/FolderCloser.js';
import { MemoryStorage, silentLogger } from '../../reopen/fakes.js';

const keyOf = (workspaceId: string | null): string =>
  workspaceId === null ? OPEN_FOLDERS_STORAGE_KEY : `${OPEN_FOLDERS_STORAGE_KEY}.${workspaceId}`;

function holdCounter(): { active: Pick<ActiveWorkspace, 'hold' | 'release'>; held: () => number } {
  let held = 0;
  return {
    active: {
      hold: (): void => void (held += 1),
      release: (): void => void (held -= 1),
    },
    held: (): number => held,
  };
}

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
  const { active } = holdCounter();
  const close = new FolderClose(new FolderCloser(tabs, silentLogger()), folders, (): void => undefined, active);
  await close.apply([3], '10', '7');

  assert.equal(storage.getItem(keyOf('7')), '[]');
  assert.equal(storage.getItem(keyOf('8')), '["10"]');
  assert.equal(storage.getItem(OPEN_FOLDERS_STORAGE_KEY), null);
  assert.equal(folders.has('10'), true);
});

test('holds the shown workspace while the tabs close and releases it after', async () => {
  const { active, held } = holdCounter();
  let duringRemove = -1;
  const tabs: CloserTabs = {
    remove: async (): Promise<void> => {
      duringRemove = held();
    },
  };
  const folders = new OpenFolders(new MemoryStorage(), silentLogger());
  const close = new FolderClose(new FolderCloser(tabs, silentLogger()), folders, (): void => undefined, active);
  await close.apply([3], '10', '7');
  assert.equal(duringRemove, 1);
  assert.equal(held(), 0);
});

test('releases the shown workspace when a tab cannot be closed', async () => {
  const { active, held } = holdCounter();
  const tabs: CloserTabs = {
    remove: async (): Promise<void> => {
      throw new Error('no');
    },
  };
  const folders = new OpenFolders(new MemoryStorage(), silentLogger());
  const close = new FolderClose(new FolderCloser(tabs, silentLogger()), folders, (): void => undefined, active);
  await close.apply([3], '10', '7');
  assert.equal(held(), 0);
});
