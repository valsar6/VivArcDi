import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ClosingLinks } from '../../../../src/modules/folders/editing/ClosingLinks.js';

test('remembers the links about to close until they are cleared', () => {
  const closing = new ClosingLinks();
  closing.add(['11', '13']);
  assert.deepEqual([closing.has('11'), closing.has('13'), closing.has('14')], [true, true, false]);
  closing.clear(['11']);
  assert.deepEqual([closing.has('11'), closing.has('13')], [false, true]);
});
