import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TabTiler } from '../../../src/shared/tabs/TabTiler.js';

function fakeTabs(vivExtData = '{"group":"g1"}'): { calls: unknown[][]; tabs: ConstructorParameters<typeof TabTiler>[0] } {
  const calls: unknown[][] = [];
  return {
    calls,
    tabs: {
      get: async (tabId: number): Promise<chrome.tabs.Tab> => ({ id: tabId, vivExtData }) as unknown as chrome.tabs.Tab,
      update: async (tabId: number, properties: Record<string, unknown>): Promise<chrome.tabs.Tab> => {
        calls.push(['update', tabId, properties]);
        return { id: tabId } as chrome.tabs.Tab;
      },
    },
  };
}

test('tab tiler writes one tiling group into each tab and keeps other data', async () => {
  const { calls, tabs } = fakeTabs();
  await new TabTiler(tabs, () => 'tile-1').tile([7, 50]);
  assert.deepEqual(
    calls.map((call): unknown => JSON.parse(String((call[2] as { vivExtData: string }).vivExtData))),
    [
      { group: 'g1', tiling: { id: 'tile-1', index: 0, layout: 'row', type: 'selection' } },
      { group: 'g1', tiling: { id: 'tile-1', index: 1, layout: 'row', type: 'selection' } },
    ],
  );
});

test('tab tiler ignores unreadable extension data', async () => {
  const { calls, tabs } = fakeTabs('not json');
  await new TabTiler(tabs, () => 'tile-1').tile([7]);
  assert.deepEqual(JSON.parse(String((calls[0]?.[2] as { vivExtData: string }).vivExtData)), {
    tiling: { id: 'tile-1', index: 0, layout: 'row', type: 'selection' },
  });
});

test('tab tiler removes the tiling group from the tabs and keeps other data', async () => {
  const { calls, tabs } = fakeTabs('{"group":"g1","tiling":{"id":"tile-1","index":0,"layout":"row","type":"selection"}}');
  await new TabTiler(tabs).untile([7, 50]);
  assert.deepEqual(
    calls.map((call): unknown => JSON.parse(String((call[2] as { vivExtData: string }).vivExtData))),
    [{ group: 'g1' }, { group: 'g1' }],
  );
});
