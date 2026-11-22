import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CommandItem, MenuItem, SubmenuItem } from '../../../src/core/dom/ContextMenu.js';
import type { ToastKind } from '../../../src/core/dom/Toast.js';
import { Logger } from '../../../src/core/support/Logger.js';
import { LinkedTabs } from '../../../src/modules/favorites/LinkedTabs.js';
import { TileLinkCommands } from '../../../src/modules/favorites/TileLinkCommands.js';
import { TileTab } from '../../../src/modules/favorites/TileTab.js';
import { LinkMenuItems } from '../../../src/modules/folders/editing/LinkMenuItems.js';
import type { LinkActions } from '../../../src/modules/folders/editing/LinkMenuItems.js';
import type { PromptOptions } from '../../../src/shared/linkmenu/PromptDialog.js';
import type { LabelCommands } from '../../../src/shared/links/LabelCommands.js';
import { CHANGE_ICON_LABEL, RENAME_LABEL } from '../../../src/shared/tabs/CommandLabels.js';
import { SilentSink } from '../../loader/fakes.js';
import { bookmarkTree, FolderTabs, folder, link, WritableChrome } from '../folders/fakes.js';

const SAVED = 'https://b.example/';

const describe = (items: MenuItem[]): string[] => items.map((entry) => ('separator' in entry ? '-' : (entry.label ?? '')));
const item = (label: string): MenuItem => ({ label, run: (): void => undefined });

const labelItems = (): MenuItem[] => [item(CHANGE_ICON_LABEL), item(RENAME_LABEL)];

function actions(): LinkActions {
  return {
    copyLink: (): MenuItem | null => item('Copy Link'),
    changeIcon: (): MenuItem | null => labelItems()[0] ?? null,
    rename: (): MenuItem | null => labelItems()[1] ?? null,
    editPinnedPage: async (): Promise<MenuItem | null> => item('Edit Pinned Page'),
    openInSplitView: async (): Promise<MenuItem | null> => item('Open in Split View'),
    duplicate: (): MenuItem | null => item('Duplicate'),
    moveTo: (): MenuItem | null => item('Move to'),
    removePin: (): MenuItem => item('Remove pin'),
    tileTab: (): MenuItem => item('Tile tab'),
  };
}

function tileCommands(labels: Pick<LabelCommands, 'items'>): TileLinkCommands {
  const chrome = new WritableChrome(bookmarkTree([folder('20', 'Favorites', [link('21', 'A', 'https://a.example/'), link('22', 'B', SAVED)])]));
  const tabs = new FolderTabs([{ id: 1, active: true }]);
  return new TileLinkCommands({
    writer: chrome.writer,
    tile: new TileTab(new LinkedTabs(tabs)),
    clipboard: { write: async (): Promise<void> => undefined },
    dialog: { ask: async (_prompt: PromptOptions): Promise<string | null> => null },
    split: {
      item: async (): Promise<MenuItem> => item('Open in Split View'),
      stop: (): void => undefined,
    },
    notify: (_text: string, _kind?: ToastKind): void => undefined,
    logger: new Logger('test', new SilentSink()),
    store: { copy: async (): Promise<void> => undefined },
    labels,
  });
}

test('adds rename and change icon to the menus of a row and a tile', async () => {
  const row = describe(await new LinkMenuItems(actions()).for('5'));
  assert.deepEqual(row, ['Copy Link', '-', CHANGE_ICON_LABEL, RENAME_LABEL, 'Edit Pinned Page', '-', 'Open in Split View', 'Duplicate', 'Move to', '-', 'Remove pin', 'Tile tab']);

  const tile = describe(await tileCommands({ items: labelItems }).items('22'));
  assert.deepEqual(tile, ['Copy Link', '-', CHANGE_ICON_LABEL, RENAME_LABEL, 'Edit Pinned Page', '-', 'Open in Split View', 'Duplicate']);
  const submenu = (await tileCommands({ items: labelItems }).items('22')).find((entry): entry is SubmenuItem => 'items' in entry) as SubmenuItem;
  assert.equal((submenu.items[0] as CommandItem).label, 'Replace Pinned URL with Current');
});
