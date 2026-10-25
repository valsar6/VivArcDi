import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONSOLE_PREFIX, PEEK_MESSAGE_TYPE, parsePeekMessage } from '../../../src/modules/peek/PeekMessage.js';

const open = { type: PEEK_MESSAGE_TYPE, token: 't', action: 'open', url: 'https://a.example/', tabId: 3, disposition: 'new-tab' };

test('peek messages are read from runtime messages and console lines', () => {
  assert.deepEqual(parsePeekMessage(open), open);
  assert.deepEqual(parsePeekMessage(`${CONSOLE_PREFIX}${JSON.stringify(open)}`), open);
  const command = { type: PEEK_MESSAGE_TYPE, token: 't', action: 'command', command: 'expand' };
  assert.deepEqual(parsePeekMessage(command), command);
});

test('invalid peek messages are ignored', () => {
  assert.equal(parsePeekMessage('hello'), null);
  assert.equal(parsePeekMessage(`${CONSOLE_PREFIX}{broken`), null);
  assert.equal(parsePeekMessage(null), null);
  assert.equal(parsePeekMessage({ ...open, type: 'other' }), null);
  assert.equal(parsePeekMessage({ ...open, token: undefined }), null);
  assert.equal(parsePeekMessage({ ...open, disposition: 'popup' }), null);
  assert.equal(parsePeekMessage({ ...open, tabId: '3' }), null);
  assert.equal(parsePeekMessage({ type: PEEK_MESSAGE_TYPE, token: 't', action: 'command', command: 'reload' }), null);
});
