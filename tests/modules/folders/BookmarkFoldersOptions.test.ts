import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOOKMARK_FOLDERS_OPTIONS } from '../../../src/modules/folders/BookmarkFoldersOptions.js';

test('has no maxHeightPercent option', () => {
  assert.equal('maxHeightPercent' in BOOKMARK_FOLDERS_OPTIONS.defaults, false);
});
