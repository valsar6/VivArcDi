import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SplitView } from '../../../../src/modules/folders/editing/SplitView.js';
import { LinkedTab } from '../../../../src/modules/folders/editing/LinkedTab.js';
import { TabData } from '../../../../src/core/tabs/TabData.js';
import { Logger } from '../../../../src/core/support/Logger.js';
import { NewTabOpener } from '../../../../src/shared/newtab/NewTabOpener.js';
import { TabTiler } from '../../../../src/shared/tabs/TabTiler.js';
import type { BookmarkNode } from '../../../../src/core/browser/bookmarks/BookmarkNode.js';
import type { MenuItem } from '../../../../src/core/dom/ContextMenu.js';
import { SilentSink } from '../../../loader/fakes.js';
import { FolderTabs } from '../fakes.js';
import type { FolderTab } from '../fakes.js';

const linkedTo = (bookmarkId: string): string => JSON.stringify({ vivarcdi: { bookmarkId } });
const tiled = (id: string, index: number): string => JSON.stringify({ tiling: { id, index, layout: 'row', type: 'selection' } });
const tilingOf = (tabs: FolderTabs, id: number): unknown => TabData.extDataOf(tabs.tabs.get(id) as chrome.tabs.Tab)['tiling'];
const SELECTED: FolderTab = { id: 1, active: true };
const TILE_TAB: FolderTab = { id: 1, active: true, vivExtData: JSON.stringify({ vivarcdi: { favoriteId: '7' } }) };
const ROW_URL = 'https://row.example/';

interface Setup {
  tabs: FolderTabs;
  split: SplitView;
  sink: SilentSink;
  focused: number[];
  toasts: Array<[string, string | undefined]>;
}

function setUp(tabList: FolderTab[], options: { available?: boolean } = {}): Setup {
  const tabs = new FolderTabs(tabList);
  tabs.available = options.available ?? true;
  const sink = new SilentSink();
  const focused: number[] = [];
  const toasts: Array<[string, string | undefined]> = [];
  const logger = new Logger('test', sink);
  const split = new SplitView({
    tabs,
    newTab: new NewTabOpener(tabs, { currentWindowId: async (): Promise<number> => 1 }, { focus: (): void => void focused.push(1) }),
    bookmarks: { get: async (id: string): Promise<BookmarkNode> => ({ id, title: 'Row', url: ROW_URL }) },
    address: { focus: (): void => void focused.push(1) },
    tiler: new TabTiler(tabs, () => 'tile-1'),
    linked: new LinkedTab(tabs),
    notify: (text, kind): void => void toasts.push([text, kind]),
    logger,
  });
  return { tabs, split, sink, focused, toasts };
}

const labelOf = (item: MenuItem | null): string => ((item as { label?: string } | null)?.label ?? '');
const isDisabled = (item: MenuItem | null): boolean => item !== null && 'disabled' in item && item.disabled === true;

test('tiles the selected tab and the row tab, the row on the left', async () => {
  const { tabs, split } = setUp([SELECTED, { id: 2, vivExtData: linkedTo('11') }]);
  await split.open('11');
  assert.deepEqual(tilingOf(tabs, 2), { id: 'tile-1', index: 0, layout: 'row', type: 'selection' });
  assert.deepEqual(tilingOf(tabs, 1), { id: 'tile-1', index: 1, layout: 'row', type: 'selection' });
});

test('opens a tab for a row with none and tiles it with the selected tab', async () => {
  const { tabs, split } = setUp([SELECTED]);
  await split.open('11');
  assert.deepEqual(tabs.calls.filter(([name]) => name === 'create'), [['create', { url: ROW_URL, active: true }]]);
  const opened = tabs.tabs.get(100) as chrome.tabs.Tab;
  assert.equal(TabData.ownOf(opened).bookmarkId, '11');
  assert.deepEqual(tilingOf(tabs, 100), { id: 'tile-1', index: 0, layout: 'row', type: 'selection' });
  assert.deepEqual(tilingOf(tabs, 1), { id: 'tile-1', index: 1, layout: 'row', type: 'selection' });
});

test('shows open in split view enabled for a row that is not the selected tab', async () => {
  const { split } = setUp([SELECTED, { id: 2, vivExtData: linkedTo('11') }]);
  const item = await split.item('11');
  assert.equal(labelOf(item), 'Open in Split View');
  assert.equal(isDisabled(item), false);
});

test('disables open in split view when the row is the selected tab', async () => {
  const { split } = setUp([{ id: 1, active: true, vivExtData: linkedTo('11') }]);
  assert.equal(isDisabled(await split.item('11')), true);
});

test('disables open in split view when the row is already tiled with the selected tab', async () => {
  const { split } = setUp([
    { id: 1, active: true, vivExtData: tiled('t', 0) },
    { id: 2, vivExtData: JSON.stringify({ tiling: { id: 't', index: 1 }, vivarcdi: { bookmarkId: '11' } }) },
  ]);
  assert.equal(isDisabled(await split.item('11')), true);
});

test('keeps open in split view enabled when no tab is selected', async () => {
  const { split } = setUp([{ id: 2, vivExtData: linkedTo('11') }]);
  assert.equal(isDisabled(await split.item('11')), false);
});

test('with no tab selected tiles the row tab and a blank tab and opens the address bar', async () => {
  const { tabs, split, focused } = setUp([{ id: 2, vivExtData: linkedTo('11') }]);
  await split.open('11');
  assert.deepEqual(tabs.calls.filter(([name]) => name === 'create'), [['create', { windowId: 1 }]]);
  assert.deepEqual(tilingOf(tabs, 2), { id: 'tile-1', index: 0, layout: 'row', type: 'selection' });
  assert.deepEqual(tilingOf(tabs, 100), { id: 'tile-1', index: 1, layout: 'row', type: 'selection' });
  assert.equal(focused.length, 1);
  split.stop();
});

test('with a Favorites tile tab selected runs New Tab and tiles the row tab and the new tab', async () => {
  const { tabs, split, focused } = setUp([TILE_TAB, { id: 2, vivExtData: linkedTo('11') }]);
  await split.open('11');
  assert.deepEqual(tabs.calls.filter(([name]) => name === 'create'), [['create', { windowId: 1 }]]);
  assert.deepEqual(tilingOf(tabs, 2), { id: 'tile-1', index: 0, layout: 'row', type: 'selection' });
  assert.deepEqual(tilingOf(tabs, 100), { id: 'tile-1', index: 1, layout: 'row', type: 'selection' });
  assert.equal(tilingOf(tabs, 1), undefined);
  assert.equal(focused.length, 1);
  split.stop();
});

test('keeps open in split view enabled when a Favorites tile tab is selected', async () => {
  const { split } = setUp([TILE_TAB, { id: 2, vivExtData: linkedTo('11') }]);
  assert.equal(isDisabled(await split.item('11')), false);
});

test('closing the blank tab without a choice closes it and undoes the split', async () => {
  const { tabs, split } = setUp([{ id: 2, vivExtData: linkedTo('11') }]);
  await split.open('11');
  tabs.close(100);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(tilingOf(tabs, 2), undefined);
  assert.equal(tabs.listenerCount(), 0);
});

test('keeps the split when the blank tab was given a page before it closed', async () => {
  const { tabs, split } = setUp([{ id: 2, vivExtData: linkedTo('11') }]);
  await split.open('11');
  tabs.navigate(100, 'https://chosen.example/');
  tabs.close(100);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(tilingOf(tabs, 2), { id: 'tile-1', index: 0, layout: 'row', type: 'selection' });
  assert.equal(tabs.listenerCount(), 0);
});

test('stop removes the listeners of a pending blank tab', async () => {
  const { tabs, split } = setUp([{ id: 2, vivExtData: linkedTo('11') }]);
  await split.open('11');
  assert.ok(tabs.listenerCount() > 0);
  split.stop();
  assert.equal(tabs.listenerCount(), 0);
});

test('is not shown and logged once when tiling cannot be driven', async () => {
  const { split, sink } = setUp([SELECTED], { available: false });
  assert.equal(await split.item('11'), null);
  assert.equal(await split.item('11'), null);
  const warnings = sink.lines.filter(([level]) => level === 'warn');
  assert.equal(warnings.length, 1);
  assert.ok(String(warnings[0]?.[2]).startsWith('Open in Split View is off: '));
});

test('shows an error toast when the split view cannot be opened', async () => {
  const { tabs, split, toasts } = setUp([SELECTED, { id: 2, vivExtData: linkedTo('11') }]);
  tabs.failing.add('update');
  await split.open('11');
  assert.deepEqual(toasts, [['Could not open the split view', 'error']]);
});
