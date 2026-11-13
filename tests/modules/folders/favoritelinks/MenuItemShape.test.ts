import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MenuItemShape } from '../../../../src/modules/folders/favoritelinks/MenuItemShape.js';

test('learns the keys of the id and the label from a plain item', () => {
  const shape = MenuItemShape.from([{ name: 'Copy', command: 'copy', shortcut: 'Ctrl+C', width: 4 }]);
  assert.deepEqual(shape?.command('x', 'Pin tab'), { name: 'Pin tab', command: 'x', shortcut: '', width: 0 });
  assert.equal(shape?.separator(), null);
});

test('skips separators and items with a submenu', () => {
  const shape = MenuItemShape.from([{ type: 'separator' }, { type: 'folder', id: 'more', label: 'More', items: [] }, { type: 'command', id: 'a', label: 'A' }]);
  assert.deepEqual(shape?.command('x', 'Pin tab'), { type: 'command', id: 'x', label: 'Pin tab' });
  assert.deepEqual(shape?.separator(), { type: 'separator' });
});

test('recognises nothing in items without an id and a label', () => {
  assert.equal(MenuItemShape.from([]), null);
  assert.equal(MenuItemShape.from([{ id: 1, label: 2 }, 'text', null]), null);
});

test('reads the id of an activation', () => {
  assert.equal(MenuItemShape.idIn('a'), 'a');
  assert.equal(MenuItemShape.idIn({ command: 'b' }), 'b');
  assert.equal(MenuItemShape.idIn(3), null);
  assert.equal(MenuItemShape.idIn(null), null);
});
