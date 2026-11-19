import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StripDragWatch } from '../../../src/shared/tabs/StripDragWatch.js';

const SLOT = new EventTarget();
const OUTSIDE = new EventTarget();

function send(root: EventTarget, type: string, extra: Record<string, unknown> = {}): void {
  const event = new Event(type);
  Object.entries({ button: 0, ...extra }).forEach(([name, value]) => Object.defineProperty(event, name, { value }));
  root.dispatchEvent(event);
}

function press(root: EventTarget, target: EventTarget = SLOT, button = 0): void {
  send(root, 'mousedown', { target, button });
}

function watched(): { root: EventTarget; changes: boolean[]; watch: StripDragWatch } {
  const root = new EventTarget();
  const changes: boolean[] = [];
  const watch = new StripDragWatch(root, (target) => target === SLOT, (dragging) => changes.push(dragging));
  watch.start();
  return { root, changes, watch };
}

test('reports a drag from the first pointer move until the release', () => {
  const { root, changes, watch } = watched();
  press(root);
  assert.equal(watch.dragging, false);
  send(root, 'mousemove');
  assert.deepEqual([watch.dragging, changes], [true, [true]]);
  send(root, 'mouseup');
  assert.deepEqual([watch.dragging, changes], [false, [true, false]]);
});

test('does not report a drag for a click', () => {
  const { root, changes, watch } = watched();
  press(root);
  send(root, 'mouseup');
  send(root, 'mousemove');
  assert.deepEqual([watch.dragging, changes], [false, []]);
});

test('ignores a press outside the slots and a press with another button', () => {
  const { root, changes } = watched();
  press(root, OUTSIDE);
  send(root, 'mousemove');
  press(root, SLOT, 2);
  send(root, 'mousemove');
  assert.deepEqual(changes, []);
});

test('ends a drag on Escape and on dragend', () => {
  const { root, changes } = watched();
  press(root);
  send(root, 'mousemove');
  send(root, 'keydown', { key: 'Escape' });
  press(root);
  send(root, 'mousemove');
  send(root, 'dragend');
  assert.deepEqual(changes, [true, false, true, false]);
});

test('ends a drag in progress and stops listening when stopped', () => {
  const { root, changes, watch } = watched();
  press(root);
  send(root, 'mousemove');
  watch.stop();
  press(root);
  send(root, 'mousemove');
  assert.deepEqual(changes, [true, false]);
});
