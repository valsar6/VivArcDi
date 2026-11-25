import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Logger } from '../../../../src/core/support/Logger.js';
import type { OpenFolders } from '../../../../src/modules/folders/tree/OpenFolders.js';
import { FolderClose } from '../../../../src/modules/folders/links/FolderClose.js';
import { FolderCloser } from '../../../../src/modules/folders/links/FolderCloser.js';
import { FolderTabs } from '../fakes.js';

function recordingLogger(): { logger: Pick<Logger, 'error'>; errors: string[] } {
  const errors: string[] = [];
  const logger: Pick<Logger, 'error'> = {
    error: (...message): void => void errors.push(String(message[0])),
  };
  return { logger, errors };
}

test('closes every tab id without unloading it', async () => {
  const tabs = new FolderTabs([{ id: 3 }, { id: 4 }]);
  const { logger } = recordingLogger();
  const closed = await new FolderCloser(tabs, logger).close([3, 4]);
  assert.equal(closed, true);
  assert.deepEqual(tabs.calls, [['remove', 3], ['remove', 4]]);
  assert.equal(tabs.tabs.size, 0);
});

test('stops at a failed close and reports it', async () => {
  const tabs = new FolderTabs([{ id: 3 }, { id: 4 }]);
  tabs.failing.add('remove');
  const { logger, errors } = recordingLogger();
  const closed = await new FolderCloser(tabs, logger).close([3, 4]);
  assert.equal(closed, false);
  assert.deepEqual(tabs.calls, [['remove', 3]]);
  assert.deepEqual(errors, ['Could not close tab 3']);
});

test('reports the folder only after every tab closed', async () => {
  const tabs = new FolderTabs([{ id: 3 }, { id: 4 }]);
  const { logger, errors } = recordingLogger();
  const seen: string[] = [];
  const openFolders = { forget: (id: string): void => void seen.push(id) } as unknown as OpenFolders;
  const close = new FolderClose(new FolderCloser(tabs, logger), openFolders, (): void => void seen.push('redraw'));
  await close.apply([3, 4], '10');
  assert.deepEqual(seen, ['10', 'redraw']);
  tabs.failing.add('remove');
  await close.apply([3, 4], '11');
  assert.deepEqual(seen, ['10', 'redraw']);
  assert.equal(errors.length, 1);
});
