import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SelectorCatalog } from '../../../src/core/dom/SelectorCatalog.js';
import type { CommandItem, MenuItem, SubmenuItem } from '../../../src/core/dom/ContextMenu.js';
import type { ToastKind } from '../../../src/core/dom/Toast.js';
import { PinnedAddress } from '../../../src/shared/linkmenu/PinnedAddress.js';
import type { PromptOptions } from '../../../src/shared/linkmenu/PromptDialog.js';
import { PinnedRowMenu } from '../../../src/modules/pinned/PinnedRowMenu.js';
import { TabPinnedStore } from '../../../src/modules/pinned/TabPinnedStore.js';
import type { FolderTab } from '../folders/fakes.js';
import { LinkingTabs, own, silentLogger } from '../favorites/linked.js';
import { event, MinusDocument } from './fakes.js';
import type { FakeEvent, MinusNode } from './fakes.js';

const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

const selectors = new SelectorCatalog(
  { browser: '[data-browser]', pinnedTab: '[data-pinned]', tabWrapper: '[data-slot]' },
  'test',
);

class FakeMenu {
  public opened: Array<{ items: MenuItem[]; x: number; y: number }> = [];
  public closed = 0;

  public open(items: MenuItem[], x: number, y: number): void {
    this.opened.push({ items, x, y });
  }

  public close(): void {
    this.closed += 1;
  }
}

interface Setup {
  document: MinusDocument;
  menu: FakeMenu;
  tabs: LinkingTabs;
  address: PinnedAddress;
  asked: PromptOptions[];
  toasts: Array<[string, ToastKind | undefined]>;
  started: PinnedRowMenu;
  pinnedRow: MinusNode;
  press: (target: unknown) => FakeEvent;
  submenu: () => SubmenuItem;
}

const pinnedRow = (document: MinusDocument, tabId: number): MinusNode => {
  const row = document.addRow(tabId);
  row.setAttribute('data-pinned', '');
  return row;
};

function started(tab: FolderTab, answer: string | null = null): Setup {
  const document = new MinusDocument();
  const menu = new FakeMenu();
  const tabs = new LinkingTabs([tab]);
  const asked: PromptOptions[] = [];
  const toasts: Array<[string, ToastKind | undefined]> = [];
  const address = new PinnedAddress({
    store: new TabPinnedStore(tabs),
    dialog: {
      ask: async (options: PromptOptions): Promise<string | null> => {
        asked.push(options);
        return answer;
      },
    },
    notify: (text: string, kind?: ToastKind): void => void toasts.push([text, kind]),
    logger: silentLogger,
  });
  const started = new PinnedRowMenu({ document: document as unknown as Document, menu, selectors, tabs, address, logger: silentLogger });
  started.start();
  const row = pinnedRow(document, tab.id);
  const press = (target: unknown): FakeEvent => document.dispatch(event('contextmenu', { target }));
  const submenu = (): SubmenuItem => {
    const items = menu.opened.at(-1)?.items ?? [];
    return items.find((item): item is SubmenuItem => 'items' in item) as SubmenuItem;
  };
  return { document, menu, tabs, address, asked, toasts, started, pinnedRow: row, press, submenu };
}

const command = (items: MenuItem[], label: string): CommandItem => items.find((item) => item.label === label) as CommandItem;

test('replaces the pinned page of a row with the current one', async () => {
  const setup = started({ id: 5, pinned: true, url: 'https://c.example/now', vivExtData: own({}, undefined, 'https://a.example/') });
  setup.press(setup.pinnedRow);
  await settle();
  command(setup.submenu().items, 'Replace Pinned URL with Current').run();
  await settle();
  assert.deepEqual(setup.tabs.extData(5), { vivarcdi: { pinnedUrl: 'https://c.example/now' } });
  setup.started.stop();
});

test('edits the pinned page of a row', async () => {
  const setup = started({ id: 5, pinned: true, url: 'https://c.example/now', vivExtData: own({ workspaceId: 7 }, undefined, 'https://a.example/') }, 'https://b.example/page');
  setup.press(setup.pinnedRow);
  await settle();
  command(setup.submenu().items, 'Edit…').run();
  await settle();
  const { title, value } = setup.asked[0] as PromptOptions;
  assert.deepEqual([title, value], ['Edit Pinned URL', 'https://a.example/']);
  assert.deepEqual(setup.tabs.extData(5), { workspaceId: 7, vivarcdi: { pinnedUrl: 'https://b.example/page' } });
  setup.started.stop();
});

test('disables replace on a pinned row when the addresses are equal', async () => {
  const setup = started({ id: 5, pinned: true, url: 'https://a.example', vivExtData: own({}, undefined, 'https://a.example/') });
  setup.press(setup.pinnedRow);
  await settle();
  assert.equal(command(setup.submenu().items, 'Replace Pinned URL with Current').disabled, true);
  const other = started({ id: 6, pinned: true, url: 'https://c.example/', vivExtData: own({}, undefined, 'https://a.example/') });
  other.press(other.pinnedRow);
  await settle();
  assert.equal(command(other.submenu().items, 'Replace Pinned URL with Current').disabled, false);
  const noTab = setup.address.menuFor('5', { open: false }) as SubmenuItem;
  assert.equal(command(noTab.items, 'Replace Pinned URL with Current').disabled, true);
  setup.started.stop();
  other.started.stop();
});

test('adds Edit Pinned Page to the menu of a pinned tab', async () => {
  const setup = started({ id: 5, pinned: true, url: 'https://c.example/', vivExtData: own({}, undefined, 'https://a.example/') });
  const fired = setup.press(setup.pinnedRow);
  assert.equal(fired.defaultPrevented, true);
  await settle();
  const items = setup.menu.opened[0]?.items ?? [];
  const edit = items.find((item): item is SubmenuItem => 'items' in item);
  assert.equal(edit?.label, 'Edit Pinned Page');
  assert.deepEqual(edit?.items.map((entry) => entry.label), ['Replace Pinned URL with Current', 'Edit…']);
  const labels = items.map((item) => item.label).filter((label): label is string => label !== undefined);
  assert.ok(labels.includes('Close tab'));
  assert.ok(labels.includes('Unpin tab'));
  assert.equal(labels.some((label) => label.startsWith('Reset')), false);
  setup.started.stop();
});

test('closes and unpins from the pinned row menu', async () => {
  const setup = started({ id: 5, pinned: true, url: 'https://c.example/' });
  setup.press(setup.pinnedRow);
  await settle();
  const items = setup.menu.opened[0]?.items ?? [];
  command(items, 'Unpin tab').run();
  await settle();
  command(items, 'Close tab').run();
  await settle();
  assert.deepEqual(setup.tabs.calls.filter(([name]) => name === 'update'), [['update', 5, { pinned: false }]]);
  assert.deepEqual(setup.tabs.calls.filter(([name]) => name === 'remove'), [['remove', 5]]);
  setup.started.stop();
});

test('leaves the menu of anything but a pinned tab to Vivaldi', async () => {
  const setup = started({ id: 5, pinned: true, url: 'https://c.example/' });
  const ordinary = setup.document.addRow(6);
  const fired = setup.press(ordinary);
  await settle();
  assert.equal(fired.defaultPrevented, false);
  assert.equal(fired.stopped, false);
  assert.equal(setup.menu.opened.length, 0);
  setup.started.stop();
});
