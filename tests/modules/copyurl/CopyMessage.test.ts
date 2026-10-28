import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COPY_CONSOLE_PREFIX, COPY_MESSAGE_TYPE, parseCopyMessage } from '../../../src/modules/copyurl/CopyMessage.js';

const copy = { type: COPY_MESSAGE_TYPE, token: 't', tabId: 3, action: 'copy' };

test('copy messages are read from runtime messages and console lines', () => {
  assert.deepEqual(parseCopyMessage(copy), copy);
  assert.deepEqual(parseCopyMessage(`${COPY_CONSOLE_PREFIX}${JSON.stringify(copy)}`), copy);
});

test('invalid copy messages are ignored', () => {
  assert.equal(parseCopyMessage('hello'), null);
  assert.equal(parseCopyMessage(`${COPY_CONSOLE_PREFIX}{broken`), null);
  assert.equal(parseCopyMessage(null), null);
  assert.equal(parseCopyMessage({ ...copy, type: 'vivarcdi-pinned' }), null);
  assert.equal(parseCopyMessage({ ...copy, token: 7 }), null);
  assert.equal(parseCopyMessage({ ...copy, tabId: '3' }), null);
  assert.equal(parseCopyMessage({ ...copy, action: 'close' }), null);
});
