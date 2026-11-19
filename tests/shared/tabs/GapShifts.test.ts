import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GapShifts } from '../../../src/shared/tabs/GapShifts.js';
import type { GapSlot } from '../../../src/shared/tabs/GapShifts.js';

const slot = (offset: number, height: number, hidden = false): GapSlot => ({ offset, height, hidden });

test('returns no shift when no slot is hidden', () => {
  const slots = [slot(0, 33), slot(33, 33), slot(66, 33)];
  assert.deepEqual(GapShifts.compute(slots), { shifts: [0, 0, 0], hiddenHeight: 0 });
});

test('offsets the visible slots by the heights of the hidden slots before them', () => {
  const slots = [slot(0, 18, true), slot(18, 33, true), slot(51, 33), slot(84, 33, true), slot(117, 33)];
  assert.deepEqual(GapShifts.compute(slots)?.shifts, [null, null, 51, null, 84]);
});

test('shifts every visible slot when the first slot is hidden', () => {
  const slots = [slot(0, 18, true), slot(18, 33), slot(51, 33)];
  assert.deepEqual(GapShifts.compute(slots)?.shifts, [null, 18, 18]);
});

test('adds the heights of consecutive hidden slots', () => {
  const slots = [slot(0, 10, true), slot(10, 20, true), slot(30, 30, true), slot(60, 33)];
  assert.deepEqual(GapShifts.compute(slots)?.shifts, [null, null, null, 60]);
});

test('counts a trailing hidden slot without shifting any slot', () => {
  const slots = [slot(0, 33), slot(33, 33), slot(66, 18, true)];
  assert.deepEqual(GapShifts.compute(slots), { shifts: [0, 0, null], hiddenHeight: 18 });
});

test('closes the whole strip when every slot is hidden', () => {
  const slots = [slot(0, 18, true), slot(18, 33, true)];
  assert.deepEqual(GapShifts.compute(slots), { shifts: [null, null], hiddenHeight: 51 });
});

test('shrinks the strip by the heights of the hidden slots', () => {
  const slots = [slot(0, 18, true), slot(18, 33, true), slot(51, 33), slot(84, 33, true)];
  assert.equal(GapShifts.compute(slots)?.hiddenHeight, 84);
});

test('orders the slots by offset, not by document order', () => {
  const slots = [slot(51, 33), slot(0, 18, true), slot(18, 33, true)];
  assert.deepEqual(GapShifts.compute(slots)?.shifts, [51, null, null]);
});

test('closes a row only when all its slots are hidden', () => {
  const slots = [slot(0, 44, true), slot(0, 44), slot(44, 44, true), slot(44, 44, true), slot(88, 33)];
  assert.deepEqual(GapShifts.compute(slots), { shifts: [null, 0, null, null, 44], hiddenHeight: 44 });
});

test('keeps fractional offsets and heights', () => {
  const slots = [slot(0, 10.5, true), slot(10.5, 33.25), slot(43.75, 33.25)];
  assert.deepEqual(GapShifts.compute(slots), { shifts: [null, 10.5, 10.5], hiddenHeight: 10.5 });
});

test('leaves the strip as it is when a slot has no valid offset or height', () => {
  assert.equal(GapShifts.compute([slot(0, 18, true), slot(Number.NaN, 33)]), null);
  assert.equal(GapShifts.compute([slot(0, 18, true), slot(18, Number.NaN)]), null);
  assert.equal(GapShifts.compute([slot(0, Number.POSITIVE_INFINITY, true), slot(18, 33)]), null);
});

test('does not change the slots it is given', () => {
  const slots = [slot(51, 33), slot(0, 18, true)];
  const before = structuredClone(slots);
  assert.notEqual(GapShifts.compute(slots), null);
  assert.deepEqual(slots, before);
});
