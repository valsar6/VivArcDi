import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CollapsedSpaces } from '../../../src/modules/spaceheader/CollapsedSpaces.js';
import { MemoryStorage, silentLogger } from '../reopen/fakes.js';

test('saves one key for each workspace and one for the area outside', () => {
  const storage = new MemoryStorage();
  const spaces = new CollapsedSpaces(storage, silentLogger());
  spaces.useWorkspace('7');
  spaces.save(true);
  spaces.useWorkspace(null);
  assert.equal(spaces.collapsed, false);
  spaces.save(true);
  spaces.useWorkspace('8');
  assert.equal(spaces.collapsed, false);
  assert.deepEqual([...storage.items].sort(), [
    ['vivarcdi.spaceCollapsed', 'true'],
    ['vivarcdi.spaceCollapsed.7', 'true'],
  ]);

  const restarted = new CollapsedSpaces(storage, silentLogger());
  restarted.useWorkspace('7');
  assert.equal(restarted.collapsed, true);
});

test('keeps the state for the session when storage fails', () => {
  const broken = {
    getItem: (): string => {
      throw new Error('unreadable');
    },
    setItem: (): void => {
      throw new Error('full');
    },
  };
  const spaces = new CollapsedSpaces(broken, silentLogger());
  spaces.useWorkspace('7');
  assert.equal(spaces.collapsed, false);
  spaces.save(true);
  assert.equal(spaces.collapsed, true);
});

test('works without storage', () => {
  const spaces = new CollapsedSpaces(null, silentLogger());
  spaces.useWorkspace('7');
  spaces.save(true);
  assert.equal(spaces.collapsed, true);
});
