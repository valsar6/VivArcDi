import { test } from 'node:test';
import assert from 'node:assert/strict';
import { systemTimers } from '../../../src/core/support/Timers.js';

test('systemTimers set runs the function after the delay', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let runs = 0;
  systemTimers.set(() => {
    runs += 1;
  }, 100);
  t.mock.timers.tick(99);
  assert.equal(runs, 0);
  t.mock.timers.tick(1);
  assert.equal(runs, 1);
});

test('systemTimers clear cancels a pending timer', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let runs = 0;
  const handle = systemTimers.set(() => {
    runs += 1;
  }, 100);
  systemTimers.clear(handle);
  t.mock.timers.tick(200);
  assert.equal(runs, 0);
});
