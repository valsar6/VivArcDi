import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LinkOpener } from '../../../src/modules/peek/LinkOpener.js';

function fakeTabs(vivExtData = '{"group":"g1"}'): { calls: unknown[][]; tabs: ConstructorParameters<typeof LinkOpener>[0] } {
  const calls: unknown[][] = [];
  return {
    calls,
    tabs: {
      get: async (tabId: number): Promise<chrome.tabs.Tab> => ({ id: tabId, index: 4, windowId: 2, vivExtData }) as unknown as chrome.tabs.Tab,
      create: async (properties: chrome.tabs.CreateProperties): Promise<chrome.tabs.Tab> => {
        calls.push(['create', properties]);
        return { id: 50 } as chrome.tabs.Tab;
      },
      update: async (tabId: number, properties: Record<string, unknown>): Promise<chrome.tabs.Tab> => {
        calls.push(['update', tabId, properties]);
        return { id: tabId } as chrome.tabs.Tab;
      },
    },
  };
}

test('link opener opens a tab right after the source tab', async () => {
  const { calls, tabs } = fakeTabs();
  const opener = new LinkOpener(tabs, { openWindow: async (): Promise<void> => {} });
  assert.equal(await opener.openAfter(7, 'https://a.example/'), 50);
  assert.deepEqual(calls, [
    ['create', { url: 'https://a.example/', index: 5, windowId: 2, openerTabId: 7, active: true }],
  ]);
});

test('link opener opens links the way Vivaldi would have', async () => {
  const { calls, tabs } = fakeTabs();
  const windows: string[] = [];
  const opener = new LinkOpener(tabs, {
    openWindow: async (url): Promise<void> => {
      windows.push(url);
    },
  });
  await opener.openAsVivaldi({ url: 'https://w.example/', tabId: 7, disposition: 'new-window' });
  await opener.openAsVivaldi({ url: 'https://t.example/', tabId: 7, disposition: 'new-tab' });
  await opener.openAsVivaldi({ url: 'https://s.example/', tabId: 7, disposition: 'same-tab' });
  assert.deepEqual(windows, ['https://w.example/']);
  assert.equal((calls[0]?.[1] as { url: string }).url, 'https://t.example/');
  assert.deepEqual(calls[1], ['update', 7, { url: 'https://s.example/' }]);
});
