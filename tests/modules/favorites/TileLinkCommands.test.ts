import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BookmarkNode } from '../../../src/core/browser/bookmarks/BookmarkNode.js';
import type { CommandItem, MenuItem, SubmenuItem } from '../../../src/core/dom/ContextMenu.js';
import type { ToastKind } from '../../../src/core/dom/Toast.js';
import { Logger } from '../../../src/core/support/Logger.js';
import { LinkedTabs } from '../../../src/modules/favorites/LinkedTabs.js';
import { TileLinkCommands } from '../../../src/modules/favorites/TileLinkCommands.js';
import { TileTab } from '../../../src/modules/favorites/TileTab.js';
import type { PromptOptions } from '../../../src/shared/linkmenu/PromptDialog.js';
import { SilentSink } from '../../loader/fakes.js';
import { FolderTabs, WritableChrome, bookmarkTree, folder, link } from '../folders/fakes.js';
import { own } from './linked.js';

const SAVED = 'https://b.example/';

interface Setup {
  chrome: WritableChrome;
  commands: TileLinkCommands;
  sink: SilentSink;
  copied: string[];
  asked: PromptOptions[];
  toasts: Array<[string, ToastKind | undefined]>;
  item: (label: string) => Promise<MenuItem>;
}

function setUp(options: { answer?: string | null; tabUrl?: string } = {}): Setup {
  const chrome = new WritableChrome(
    bookmarkTree([folder('20', 'Favorites', [link('21', 'A', 'https://a.example/'), link('22', 'B', SAVED), link('23', 'C', 'https://c.example/')])]),
  );
  const tabs = new FolderTabs([
    { id: 1, active: true },
    ...(options.tabUrl === undefined ? [] : [{ id: 2, url: options.tabUrl, vivExtData: own({}, '22', SAVED) }]),
  ]);
  const sink = new SilentSink();
  const copied: string[] = [];
  const asked: PromptOptions[] = [];
  const toasts: Array<[string, ToastKind | undefined]> = [];
  const commands = new TileLinkCommands({
    writer: chrome.writer,
    tile: new TileTab(new LinkedTabs(tabs)),
    clipboard: { write: async (text: string): Promise<void> => void copied.push(text) },
    dialog: {
      ask: async (prompt: PromptOptions): Promise<string | null> => {
        asked.push(prompt);
        return options.answer ?? null;
      },
    },
    split: { item: async (): Promise<MenuItem> => ({ label: 'Open in Split View', run: (): void => undefined }), stop: (): void => undefined },
    notify: (text, kind): void => void toasts.push([text, kind]),
    logger: new Logger('test', sink),
  });
  const item = async (label: string): Promise<MenuItem> => {
    const found = (await commands.items('22')).find((entry) => entry.label === label);
    return found as MenuItem;
  };
  return { chrome, commands, sink, copied, asked, toasts, item };
}

const settled = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));
const childrenOf = (chrome: WritableChrome): BookmarkNode[] => {
  const find = (nodes: BookmarkNode[]): BookmarkNode | undefined => nodes.flatMap((node) => (node.id === '20' ? [node] : (find(node.children ?? []) ?? []))).at(0);
  return find(chrome.tree)?.children ?? [];
};

test('copies the saved link of a tile', async () => {
  const { item, copied, toasts } = setUp();
  (await item('Copy Link') as CommandItem).run();
  await settled();
  assert.deepEqual(copied, [SAVED]);
  assert.deepEqual(toasts, [['Copied', undefined]]);
});

test('duplicates a tile right after it', async () => {
  const { chrome, item } = setUp();
  (await item('Duplicate') as CommandItem).run();
  await settled();
  assert.deepEqual(
    childrenOf(chrome).map((node) => [node.title, node.url]),
    [['A', 'https://a.example/'], ['B', SAVED], ['B', SAVED], ['C', 'https://c.example/']],
  );
});

test('edits the pinned url of a tile', async () => {
  const { chrome, item, asked } = setUp({ answer: 'https://d.example/' });
  const submenu = (await item('Edit Pinned Page')) as SubmenuItem;
  (submenu.items.find((entry) => entry.label === 'Edit…') as CommandItem).run();
  await settled();
  assert.equal(asked[0]?.value, SAVED);
  assert.deepEqual(childrenOf(chrome).map((node) => node.url), ['https://a.example/', 'https://d.example/', 'https://c.example/']);
  assert.equal(childrenOf(chrome)[1]?.title, 'B');
});

test('replaces the pinned url of a tile with the current one', async () => {
  const { chrome, item } = setUp({ tabUrl: 'https://now.example/' });
  const submenu = (await item('Edit Pinned Page')) as SubmenuItem;
  const replace = submenu.items.find((entry) => entry.label === 'Replace Pinned URL with Current') as CommandItem;
  assert.equal(replace.disabled, false);
  replace.run();
  await settled();
  assert.equal(childrenOf(chrome)[1]?.url, 'https://now.example/');
  const none = (await setUp().item('Edit Pinned Page')) as SubmenuItem;
  assert.equal((none.items[0] as CommandItem).disabled, true);
});

test('lists the link commands of a tile in three groups', async () => {
  const { commands } = setUp();
  const items = await commands.items('22');
  assert.deepEqual(items.map((entry) => ('separator' in entry ? '-' : entry.label)), ['Copy Link', '-', 'Edit Pinned Page', '-', 'Open in Split View', 'Duplicate']);
});

test('leaves a tile whose bookmark cannot be read without link commands', async () => {
  const { commands, sink } = setUp();
  assert.deepEqual(await commands.items('999'), []);
  assert.deepEqual(await commands.items('999'), []);
  assert.equal(sink.lines.filter((line) => line[0] === 'warn').length, 1);
  assert.match(String(sink.lines.find((line) => line[0] === 'warn')?.[2]), /The tile 999 cannot be read: its menu has no link commands/);
});
