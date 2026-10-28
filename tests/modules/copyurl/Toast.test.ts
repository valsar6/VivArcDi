import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Toast, TOAST_ATTRIBUTE, VISIBLE_ATTRIBUTE } from '../../../src/modules/copyurl/Toast.js';
import { FakeElement } from '../peek/fakes.js';
import { asDocument, CopyDocument, ManualTimers } from './fakes.js';

const setUp = (): { toast: Toast; parent: FakeElement; timers: ManualTimers } => {
  const parent = new FakeElement('div');
  const timers = new ManualTimers();
  const toast = new Toast({ document: asDocument(new CopyDocument()), parent: parent as unknown as Element, durationMs: 2000, timers });
  return { toast, parent, timers };
};

test('toast shows a status message and hides it after its duration', () => {
  const { toast, parent, timers } = setUp();
  toast.show('Copied');
  const [element] = parent.children;
  assert.ok(element?.hasAttribute(TOAST_ATTRIBUTE));
  assert.equal(element?.getAttribute('role'), 'status');
  assert.equal(element?.textContent, 'Copied');
  assert.ok(element?.hasAttribute(VISIBLE_ATTRIBUTE));
  assert.deepEqual([...timers.pending.values()].map(({ delayMs }) => delayMs), [2000]);
  timers.fire();
  assert.equal(element?.hasAttribute(VISIBLE_ATTRIBUTE), false);
});

test('a second toast restarts the timer instead of stacking', () => {
  const { toast, parent, timers } = setUp();
  toast.show('Copied');
  toast.show('Copy failed');
  assert.equal(parent.children.length, 1);
  assert.equal(parent.children[0]?.textContent, 'Copy failed');
  assert.equal(timers.pending.size, 1);
  timers.fire();
  toast.show('Copied');
  assert.equal(parent.children.length, 1);
  assert.ok(parent.children[0]?.hasAttribute(VISIBLE_ATTRIBUTE));
});

test('removing the toast cancels its timer and takes it out of the window', () => {
  const { toast, parent, timers } = setUp();
  toast.show('Copied');
  toast.remove();
  assert.deepEqual(parent.children, []);
  assert.equal(timers.pending.size, 0);
});
