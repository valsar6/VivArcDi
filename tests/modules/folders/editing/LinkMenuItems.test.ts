import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { MenuItem } from '../../../../src/core/dom/ContextMenu.js';
import { LinkMenuItems } from '../../../../src/modules/folders/editing/LinkMenuItems.js';
import type { LinkActions } from '../../../../src/modules/folders/editing/LinkMenuItems.js';

const item = (label: string): MenuItem => ({ label, run: (): void => undefined });
const describe = (items: MenuItem[]): string[] => items.map((entry) => ('separator' in entry ? '-' : (entry.label ?? '')));

function actions(present: Partial<Record<'copy' | 'edit' | 'split' | 'duplicate' | 'move', boolean>> = {}): LinkActions {
  const all = { copy: true, edit: true, split: true, duplicate: true, move: true, ...present };
  return {
    copyLink: (): MenuItem | null => (all.copy ? item('Copy Link') : null),
    editPinnedPage: async (): Promise<MenuItem | null> => (all.edit ? item('Edit Pinned Page') : null),
    openInSplitView: async (): Promise<MenuItem | null> => (all.split ? item('Open in Split View') : null),
    duplicate: (): MenuItem | null => (all.duplicate ? item('Duplicate') : null),
    moveTo: (): MenuItem | null => (all.move ? item('Move to') : null),
    removePin: (): MenuItem => item('Remove pin'),
    tileTab: (): MenuItem => item('Tile tab'),
  };
}

test('lists the menu of a saved tab in Arc order with separators', async () => {
  const items = await new LinkMenuItems(actions()).for('5');
  assert.deepEqual(describe(items), [
    'Copy Link',
    '-',
    'Edit Pinned Page',
    '-',
    'Open in Split View',
    'Duplicate',
    'Move to',
    '-',
    'Remove pin',
    'Tile tab',
  ]);
});

test('drops the missing items and the separators of an empty group', async () => {
  const some = await new LinkMenuItems(actions({ edit: false, split: false, move: false })).for('5');
  assert.deepEqual(describe(some), ['Copy Link', '-', 'Duplicate', '-', 'Remove pin', 'Tile tab']);
  const none = await new LinkMenuItems(actions({ copy: false, duplicate: false, edit: false })).for('5');
  assert.deepEqual(describe(none), ['Open in Split View', 'Move to', '-', 'Remove pin', 'Tile tab']);
});

test('keeps the menu of today when every slot is null', async () => {
  const none = { copy: false, edit: false, split: false, duplicate: false, move: false };
  assert.deepEqual(describe(await new LinkMenuItems(actions(none)).for('5')), ['Remove pin', 'Tile tab']);
});

test('asks every action for the clicked link', async () => {
  const seen: string[] = [];
  const base = actions();
  const spy: LinkActions = {
    ...base,
    copyLink: (id): MenuItem | null => (seen.push(`copy ${id}`), base.copyLink(id)),
    editPinnedPage: async (id): Promise<MenuItem | null> => (seen.push(`edit ${id}`), base.editPinnedPage(id)),
    removePin: (id): MenuItem => (seen.push(`remove ${id}`), base.removePin(id)),
  };
  await new LinkMenuItems(spy).for('9');
  assert.deepEqual(seen.sort(), ['copy 9', 'edit 9', 'remove 9']);
});
