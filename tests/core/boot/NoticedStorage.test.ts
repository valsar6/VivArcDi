import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NoticedStorage } from '../../../src/core/boot/NoticedStorage.js';
import type { SaveOutcome, SavingStorage } from '../../../src/core/browser/SavingStorage.js';
import { Notices } from '../../../src/core/dom/Notices.js';
import { RecordingToast } from '../../loader/fakes.js';

const failing: SavingStorage = {
  mode: 'persistent',
  getItem: () => null,
  setItem: () => undefined,
  save: async (): Promise<SaveOutcome> => 'failed',
};

test('warns once when a save fails', async () => {
  const toast = new RecordingToast();
  const storage = new NoticedStorage(failing, new Notices(toast));
  storage.setItem('a', '1');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(await storage.save('b', '2'), 'failed');
  assert.deepEqual(toast.shown, [
    { text: 'VivArcDi could not save its data: changes may be lost when Vivaldi restarts', kind: 'error' },
  ]);
});
