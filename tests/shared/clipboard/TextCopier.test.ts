import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TextCopier } from '../../../src/shared/clipboard/TextCopier.js';
import { asDocument, CopyDocument, FakeClipboard } from '../../modules/copyurl/fakes.js';

test('a text copier writes any text and falls back to a hidden field', async () => {
  const clipboard = new FakeClipboard();
  const document = new CopyDocument({}, clipboard);
  await TextCopier.for(asDocument(document), clipboard).write('WDJB-MJHT');
  assert.deepEqual(clipboard.written, ['WDJB-MJHT']);
  clipboard.refuse = true;
  await TextCopier.for(asDocument(document), clipboard).write('https://github.com/a/b/pull/1');
  assert.deepEqual(document.copiedFromField, ['https://github.com/a/b/pull/1']);
});
