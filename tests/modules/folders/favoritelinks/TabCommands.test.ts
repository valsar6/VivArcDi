import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Logger } from '../../../../src/core/support/Logger.js';
import { TabMenuItems } from '../../../../src/modules/folders/favoritelinks/TabMenuItems.js';
import { FAILED_TEXT } from '../../../../src/modules/folders/favoritelinks/FavoriteShortcut.js';
import { TabCommands } from '../../../../src/modules/folders/favoritelinks/TabCommands.js';
import { asDocument, DomDocument } from '../../../core/dom.js';
import { SilentSink } from '../../../loader/fakes.js';

const ITEMS = [{ type: 'command', id: 'new-tab', label: 'New Tab', enabled: true }];

const rowOf = (tabId: number): unknown => {
  const wrapper = { dataset: { id: `tab-${tabId}` }, closest: (): unknown => wrapper, querySelector: (): null => null };
  return { closest: (): unknown => wrapper, querySelector: (): unknown => wrapper };
};

const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

interface Setup {
  calls: string[];
  notes: string[];
  choose: (tab: Partial<chrome.tabs.Tab>, id: string) => Promise<string[]>;
}

function setup(tiled = true): Setup {
  const calls: string[] = [];
  const notes: string[] = [];
  const commands = new TabCommands({
    favorites: { add: async (tab): Promise<'added'> => (calls.push(`add ${tab.id}`), 'added') },
    grid: {
      end: (): object => ({ beforeId: null }),
      drop: async (_target, page): Promise<boolean> => (calls.push(`drop ${'tab' in page ? page.tab.id : 'page'}`), tiled),
    },
    notify: (text): void => void notes.push(text),
  });
  const choose = async (tab: Partial<chrome.tabs.Tab>, id: string): Promise<string[]> => {
    const dom = new DomDocument();
    let activate: ((...values: unknown[]) => void) | undefined;
    const labels: string[] = [];
    const contextMenu = {
      show: (params: { items: Array<{ label?: string }> }, callback: (...values: unknown[]) => void): void => {
        labels.push(...params.items.map((item) => item.label ?? 'separator'));
        activate = callback;
      },
    };
    new TabMenuItems({
      document: asDocument(dom),
      contextMenu,
      wrapperSelector: '.wrapper',
      tabs: { get: async (tabId): Promise<chrome.tabs.Tab> => ({ id: tabId, url: 'https://example.com/', ...tab }) as chrome.tabs.Tab },
      commands: commands.commands,
      appliesTo: (found): boolean => TabCommands.appliesTo(found),
      logger: new Logger('test', new SilentSink()),
    }).start();
    dom.emit('contextmenu', { target: rowOf(7) });
    await (contextMenu.show as (...args: unknown[]) => Promise<void>)({ items: ITEMS }, (): void => undefined);
    activate?.(id);
    await settle();
    return labels;
  };
  return { calls, notes, choose };
}

test('pins a tab of today from the menu', async () => {
  const { calls, choose } = setup();
  const labels = await choose({}, 'vivarcdi-pin-tab');
  assert.deepEqual(labels, ['New Tab', 'separator', 'Pin tab', 'Tile tab']);
  assert.deepEqual(calls, ['add 7']);
});

test('tiles a tab of today from the menu', async () => {
  const { calls, notes, choose } = setup();
  await choose({}, 'vivarcdi-tile-tab');
  assert.deepEqual(calls, ['drop 7']);
  assert.deepEqual(notes, []);
});

test('says so when the tab cannot become a tile', async () => {
  const { notes, choose } = setup(false);
  await choose({}, 'vivarcdi-tile-tab');
  assert.deepEqual(notes, [FAILED_TEXT]);
});

test('offers the commands only for a web page that is not pinned, a Favorite or a link', () => {
  assert.equal(TabCommands.appliesTo({ url: 'https://example.com/' } as chrome.tabs.Tab), true);
  assert.equal(TabCommands.appliesTo({ url: 'vivaldi://settings' } as chrome.tabs.Tab), false);
  assert.equal(TabCommands.appliesTo({ url: 'https://example.com/', pinned: true } as chrome.tabs.Tab), false);
  assert.equal(TabCommands.appliesTo({ url: 'https://example.com/', vivExtData: JSON.stringify({ vivarcdi: { bookmarkId: '1' } }) } as unknown as chrome.tabs.Tab), false);
});
