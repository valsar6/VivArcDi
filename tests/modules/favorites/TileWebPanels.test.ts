import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SelectorCatalog } from '../../../src/core/dom/SelectorCatalog.js';
import type { Logger } from '../../../src/core/support/Logger.js';
import { TileWebPanels } from '../../../src/modules/favorites/TileWebPanels.js';
import type { TileWebPanelsDependencies } from '../../../src/modules/favorites/TileWebPanels.js';
import { WebPanelList } from '../../../src/modules/favorites/panels/WebPanelList.js';
import { silentLogger as logger } from './linked.js';
import type { BrowserPrefs } from '../../../src/core/browser/BrowserPrefs.js';
import type { PanelDocument } from '../../../src/modules/favorites/panels/PanelBar.js';

interface Setup {
  panels: TileWebPanels;
  calls: string[];
}

function setup({ url = 'https://example.com/page', panelUrl = null, available = true }: { url?: string; panelUrl?: string | null; available?: boolean } = {}): Setup {
  const calls: string[] = [];
  const list = new WebPanelList({
    prefs: { get: async (): Promise<unknown> => (panelUrl === null ? [{ id: 'WEBPANEL_other', url: 'https://other.example/' }] : [{ id: 'WEBPANEL_a', url: panelUrl }]) },
    bar: { panelIds: (): string[] => ['WEBPANEL_a', 'WEBPANEL_other'], show: (id): boolean => !!calls.push(`show ${id}`), available },
  });
  const deps: TileWebPanelsDependencies = {
    writer: { get: async (id) => ({ id, title: 't', url }) },
    list,
    form: { add: async (address): Promise<void> => void calls.push(`add ${address}`) },
    logger,
  };
  return { panels: new TileWebPanels(deps), calls };
}

test('offers open as web panel on a tile', async () => {
  const item = await setup().panels.item('f1');
  assert.equal(item?.label, 'Open as web panel');
});

test('hides open as web panel for other schemes', async () => {
  for (const url of ['vivaldi://settings', 'file:///tmp/a.html', 'about:blank', '']) {
    assert.equal(await setup({ url }).panels.item('f1'), null);
  }
});

test('adds a web panel for a tile', async () => {
  const { panels, calls } = setup();
  (await panels.item('f1'))?.run();
  assert.deepEqual(calls, ['add https://example.com/page']);
});

test('offers show web panel when the tile is a panel', async () => {
  const item = await setup({ panelUrl: 'https://example.com/page/' }).panels.item('f1');
  assert.equal(item?.label, 'Show web panel');
});

test('shows the panel of the tile without adding one', async () => {
  const { panels, calls } = setup({ panelUrl: 'https://example.com/page#top' });
  (await panels.item('f1'))?.run();
  assert.deepEqual(calls, ['show WEBPANEL_a']);
});

test('leaves the tile and other panels untouched', async () => {
  const { panels, calls } = setup({ panelUrl: 'https://example.com/page' });
  (await panels.item('f1'))?.run();
  assert.deepEqual(calls, ['show WEBPANEL_a']);
  const opened = setup();
  (await opened.panels.item('f1'))?.run();
  assert.deepEqual(opened.calls, ['add https://example.com/page']);
});

test('hides the web panel commands when the form is missing', async () => {
  assert.equal(await setup({ available: false }).panels.item('f1'), null);
  const catalog = new SelectorCatalog({ browser: '#browser' }, 'test');
  const prefs = { available: true } as BrowserPrefs;
  const warned: unknown[][] = [];
  const quiet = { warn: (...message: unknown[]): number => warned.push(message), error: (): void => undefined } as unknown as Logger;
  assert.equal(TileWebPanels.of({ document: {} as PanelDocument, selectors: catalog, prefs, writer: { get: async () => ({}) as never }, logger: quiet }), null);
  assert.equal(warned.length, 1);
});
