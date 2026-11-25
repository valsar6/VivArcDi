import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Logger } from '../../../../src/core/support/Logger.js';
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
