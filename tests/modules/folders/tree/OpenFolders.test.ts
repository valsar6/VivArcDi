import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OPEN_FOLDERS_STORAGE_KEY, OpenFolders } from '../../../src/modules/folders/OpenFolders.js';
import { MemoryStorage, silentLogger } from '../reopen/fakes.js';

test('remembers the open folders of each workspace separately', () => {
  const storage = new MemoryStorage();
  const folders = new OpenFolders(storage, silentLogger());
  folders.useWorkspace(null);
  folders.toggle('10');
  folders.useWorkspace('7');
  assert.equal(folders.has('10'), false);
  folders.toggle('20');
  folders.useWorkspace('8');
  assert.equal(folders.has('20'), false);
  folders.toggle('10');

  assert.equal(storage.getItem(OPEN_FOLDERS_STORAGE_KEY), '["10"]');
  assert.equal(storage.getItem(`${OPEN_FOLDERS_STORAGE_KEY}.7`), '["20"]');
  assert.equal(storage.getItem(`${OPEN_FOLDERS_STORAGE_KEY}.8`), '["10"]');

  const restarted = new OpenFolders(storage, silentLogger());
  restarted.useWorkspace('7');
  assert.deepEqual(['10', '20'].map((id) => restarted.has(id)), [false, true]);
  restarted.useWorkspace(null);
  assert.deepEqual(['10', '20'].map((id) => restarted.has(id)), [true, false]);
});

test('keeps the existing key for the area outside workspaces', () => {
  const storage = new MemoryStorage();
  storage.setItem('vivarcdi.openFolders', '["5"]');
  const folders = new OpenFolders(storage, silentLogger());
  folders.useWorkspace(null);
  assert.equal(folders.has('5'), true);
});

test('starts with every folder closed in a workspace with nothing saved or a broken value', () => {
  const storage = new MemoryStorage();
  storage.setItem('vivarcdi.openFolders.9', 'not json');
  const folders = new OpenFolders(storage, silentLogger());
  folders.useWorkspace(null);
  folders.toggle('1');
  folders.useWorkspace('9');
  assert.equal(folders.has('1'), false);
});
