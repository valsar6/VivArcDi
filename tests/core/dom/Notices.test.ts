import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Notices } from '../../../src/core/dom/Notices.js';
import { RecordingToast } from '../../loader/fakes.js';

test('shows a keyed notice once per session', () => {
  const toast = new RecordingToast();
  const notices = new Notices(toast);
  notices.once('saving', 'Cannot save', 'error');
  notices.once('saving', 'Cannot save', 'error');
  notices.once('other', 'Other');
  notices.show('Now');
  notices.show('Now');
  assert.deepEqual(toast.shown, [
    { text: 'Cannot save', kind: 'error' },
    { text: 'Other', kind: 'ok' },
    { text: 'Now', kind: 'ok' },
    { text: 'Now', kind: 'ok' },
  ]);
  notices.remove();
  assert.equal(toast.removed, 1);
});
