import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ShortcutKeys } from '../../src/core/ShortcutKeys.js';
import type { ShortcutKey } from '../../src/core/ShortcutKeys.js';

const press = (key: string, modifiers: Partial<Record<'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey', boolean>> = {}): ShortcutKey => ({
  key,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...modifiers,
});

test('recognizes Cmd+Shift and Ctrl+Shift with a letter in either case', () => {
  assert.equal(ShortcutKeys.isCommandShift(press('C', { metaKey: true, shiftKey: true }), 'c'), true);
  assert.equal(ShortcutKeys.isCommandShift(press('a', { ctrlKey: true, shiftKey: true }), 'a'), true);
});

test('ignores the letter without Shift, with Alt or without Cmd and Ctrl', () => {
  assert.equal(ShortcutKeys.isCommandShift(press('c', { metaKey: true }), 'c'), false);
  assert.equal(ShortcutKeys.isCommandShift(press('c', { metaKey: true, shiftKey: true, altKey: true }), 'c'), false);
  assert.equal(ShortcutKeys.isCommandShift(press('c', { shiftKey: true }), 'c'), false);
  assert.equal(ShortcutKeys.isCommandShift(press('x', { metaKey: true, shiftKey: true }), 'c'), false);
});
