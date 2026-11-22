import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { LinkLabels } from '../../../src/core/browser/LinkLabels.js';
import type { CommandItem, MenuItem } from '../../../src/core/dom/ContextMenu.js';
import { SelectorCatalog } from '../../../src/core/dom/SelectorCatalog.js';
import type { ToastKind } from '../../../src/core/dom/Toast.js';
import { Logger } from '../../../src/core/support/Logger.js';
import { LABEL_KEY_ATTRIBUTE, TILE_ATTRIBUTE, TILE_LABEL_ATTRIBUTE } from '../../../src/modules/favorites/FavoritesView.js';
import { LinkedTabs } from '../../../src/modules/favorites/LinkedTabs.js';
import { PinnedFavorites } from '../../../src/modules/favorites/PinnedFavorites.js';
import { TileLinkCommands } from '../../../src/modules/favorites/TileLinkCommands.js';
import { TileMenu } from '../../../src/modules/favorites/TileMenu.js';
import { TileTab } from '../../../src/modules/favorites/TileTab.js';
import type { PromptOptions } from '../../../src/shared/linkmenu/PromptDialog.js';
import { LabelCommands } from '../../../src/shared/links/LabelCommands.js';
import { HiddenTabs } from '../../../src/shared/tabs/HiddenTabs.js';
import { CHANGE_ICON_LABEL, RENAME_LABEL } from '../../../src/shared/tabs/CommandLabels.js';
import { asDocument, asElement } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';
import { SvgDocument } from '../../shared/icons/fakes.js';
import { bookmarkTree, FolderTabs, WritableChrome } from '../folders/fakes.js';
import type { FolderTab } from '../folders/fakes.js';
import { SilentSink } from '../../loader/fakes.js';
import { MemoryStorage, settle, silentLogger } from '../reopen/fakes.js';
import { own } from './linked.js';

const catalog = new SelectorCatalog({ browser: '#browser', tabListHost: '.list' }, 'test');
const inWorkspace = (id: number): string => JSON.stringify({ workspaceId: id });

const installFakes = (t: TestContext): void => {
  const globals = globalThis as unknown as Record<string, unknown>;
  globals['MutationObserver'] = class {
    public observe(): void {}
    public disconnect(): void {}
  };
  t.after(() => delete globals['MutationObserver']);
};

const pinned = (id: number, extra: Partial<FolderTab> = {}): FolderTab => ({
  id,
  index: 0,
  pinned: true,
  url: `https://site${id}.example/`,
  title: `Site ${id}`,
  vivExtData: inWorkspace(7),
  ...extra,
});

interface Setup {
  dom: SvgDocument;
  labels: LinkLabels;
  favorites: PinnedFavorites;
  commands: TileLinkCommands;
  opened: MenuItem[][];
  tileOf: (id: string) => DomNode | undefined;
}

async function setup(t: TestContext, tabs: FolderTab[]): Promise<Setup> {
  installFakes(t);
  const dom = new SvgDocument();
  const fake = new FolderTabs(tabs);
  const labels = LinkLabels.of(new MemoryStorage(), silentLogger());
  const favorites = new PinnedFavorites({
    document: asDocument(dom),
    selectors: catalog,
    tabs: fake,
    logger: silentLogger(),
    labels,
    maxTiles: 12,
    hiddenTabs: new HiddenTabs(),
    onChange: (): void => undefined,
  });
  await favorites.start();
  t.after(() => favorites.stop());
  const tileOf = (id: string): DomNode | undefined =>
    (favorites.element as unknown as DomNode).children.find((child) => child.getAttribute(TILE_ATTRIBUTE) === id);
  const labelCommands = new LabelCommands({
    labels,
    editor: { edit: async (): Promise<string> => 'Mail' },
    picker: { pick: async (): Promise<{ icon: { emoji: string } }> => ({ icon: { emoji: '📌' } }) },
    favicon: { read: async (): Promise<null> => null },
    keyOf: (id): string | null => tileOf(id)?.getAttribute(LABEL_KEY_ATTRIBUTE) ?? null,
    target: (id): { anchor: HTMLElement; covers: boolean } | null => {
      const element = tileOf(id);
      return element === undefined ? null : { anchor: asElement(element), covers: false };
    },
    textOf: (id): string => tileOf(id)?.getAttribute(TILE_LABEL_ATTRIBUTE) ?? '',
    pageOf: async (): Promise<{ url: string }> => ({ url: 'https://www.mail.example/inbox' }),
    notify: (_text: string, _kind?: ToastKind): void => undefined,
    logger: silentLogger(),
  });
  const chrome = new WritableChrome(bookmarkTree([]));
  const commands = new TileLinkCommands({
    writer: chrome.writer,
    tile: new TileTab(new LinkedTabs(fake)),
    clipboard: { write: async (): Promise<void> => undefined },
    dialog: { ask: async (_prompt: PromptOptions): Promise<string | null> => null },
    split: {
      item: async (): Promise<MenuItem> => ({ label: 'Open in Split View', run: (): void => undefined }),
      stop: (): void => undefined,
    },
    notify: (_text: string, _kind?: ToastKind): void => undefined,
    logger: new Logger('test', new SilentSink()),
    store: { copy: async (): Promise<void> => undefined },
    labels: labelCommands,
  });
  const opened: MenuItem[][] = [];
  new TileMenu({
    document: asDocument(dom),
    grid: (): HTMLElement => favorites.element,
    menu: {
      open: (items): void => void opened.push(items),
      close: (): void => undefined,
    },
    removal: { untile: async (): Promise<void> => undefined, pin: async (): Promise<void> => undefined },
    links: commands,
  }).attach();
  dom.emit('contextmenu', {
    target: tileOf('77'),
    clientX: 1,
    clientY: 2,
    preventDefault: (): void => undefined,
    stopPropagation: (): void => undefined,
  });
  await settle();
  return { dom, labels, favorites, commands, opened, tileOf };
}

const labels = (items: MenuItem[]): string[] => items.map((entry) => ('separator' in entry ? '-' : (entry.label ?? '')));

test('renames and re-icons a tile made from a pinned tab', async (t) => {
  const setupData = await setup(t, [pinned(77, { active: true, vivExtData: own({ workspaceId: 7 }, undefined, 'https://www.mail.example/inbox') })]);
  assert.deepEqual(labels(setupData.opened[0] ?? []), [CHANGE_ICON_LABEL, RENAME_LABEL, '-', 'Untile tab', 'Pin tab']);

  const rename = (setupData.opened[0] ?? []).find((entry): entry is CommandItem => 'run' in entry && entry.label === RENAME_LABEL) as CommandItem;
  rename.run();
  await settle();
  assert.deepEqual(setupData.labels.get('page:mail.example/inbox'), { name: 'Mail' });
  assert.equal(setupData.tileOf('77')?.getAttribute(TILE_LABEL_ATTRIBUTE), 'Mail');

  const changeIcon = (setupData.opened[0] ?? []).find((entry): entry is CommandItem => 'run' in entry && entry.label === CHANGE_ICON_LABEL) as CommandItem;
  changeIcon.run();
  await settle();
  assert.deepEqual(setupData.labels.get('page:mail.example/inbox'), { name: 'Mail', icon: { emoji: '📌' } });
  assert.equal(setupData.tileOf('77')?.children[0]?.textContent, '📌');
  assert.equal(setupData.tileOf('77')?.getAttribute(TILE_LABEL_ATTRIBUTE), 'Mail');
});

test('a tile with no label key gets no label items', async (t) => {
  const setupData = await setup(t, [pinned(78, { active: true, url: 'vivaldi://settings' })]);
  assert.deepEqual(await setupData.commands.items('78'), []);
});
