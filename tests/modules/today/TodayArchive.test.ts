import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ModuleContext } from '../../../src/core/Module.js';
import { ModuleRegistry } from '../../../src/core/ModuleRegistry.js';
import { BrowserRuntime } from '../../../src/core/BrowserRuntime.js';
import { SelectorCatalog } from '../../../src/core/SelectorCatalog.js';
import { ARCHIVE_STORAGE_KEY } from '../../../src/modules/today/ArchiveStore.js';
import { TodayArchive } from '../../../src/modules/today/TodayArchive.js';
import { asDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';
import { FakeLoader } from '../../loader/fakes.js';
import { immediateFrames } from '../folders/fakes.js';
import type { FolderTab } from '../folders/fakes.js';
import { event } from '../pinned/fakes.js';
import { MemoryStorage, silentLogger } from '../reopen/fakes.js';
import { HOUR, ManualTimer, NOW, TodayDocument, TodayTabs, stamped } from './fakes.js';

const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

const selectors = new SelectorCatalog(
  { browser: '#browser', tabBar: '#bar', tabsContainer: '#tabs-container', webviewContainer: '#webviews', tabWebview: 'webview' },
  'test',
);

function context(tabs: TodayTabs, storage: MemoryStorage, dom: TodayDocument, options: Record<string, unknown> = {}): ModuleContext {
  return {
    document: asDocument(dom),
    selectors,
    logger: silentLogger(),
    options: { enabled: true, ...options },
    tabs,
    storage,
    runtime: new BrowserRuntime(undefined),
    payload: new FakeLoader({ 'page/archive-keys.js': 'code' }),
  } as unknown as ModuleContext;
}

function headless(): TodayDocument {
  const dom = new TodayDocument();
  dom.querySelector = (): null => null;
  return dom;
}

const TABS = (): FolderTab[] => [
  { id: 1, active: true, url: 'https://active.example/' },
  { id: 2, url: 'https://left.example/', title: 'Left before the restart', vivExtData: stamped(NOW - 13 * HOUR) },
];

test('counts inactivity across restarts', async () => {
  const tabs = new TodayTabs(TABS());
  const storage = new MemoryStorage();
  const timer = new ManualTimer();
  const module = new TodayArchive({ now: (): number => NOW, repeat: timer.repeat });
  await module.start(context(tabs, storage, headless()));
  assert.deepEqual(tabs.removedIds(), []);
  timer.tick();
  await settle();
  assert.deepEqual(tabs.removedIds(), [2]);
  assert.match(storage.getItem(ARCHIVE_STORAGE_KEY) ?? '', /Left before the restart/);
  module.stop();
});

test('disabled module closes nothing', async () => {
  const tabs = new TodayTabs(TABS());
  const { modules } = new ModuleRegistry().register(TodayArchive).createEnabled({ 'today-archive': { enabled: false } });
  assert.equal(modules.length, 0);
  const timer = new ManualTimer();
  const module = new TodayArchive({ now: (): number => NOW, repeat: timer.repeat });
  await module.start(context(tabs, new MemoryStorage(), headless(), { archiveAfterHours: 1 }));
  module.stop();
  timer.tick();
  await settle();
  assert.deepEqual(tabs.removedIds(), []);
  assert.equal(timer.jobs.size, 0);
  assert.equal(tabs.listenerCount(), 0);
});

test('clamps archiveAfterHours to at least one hour', async () => {
  const tabs = new TodayTabs([{ id: 1, active: true, url: 'https://active.example/' }, { id: 2, url: 'https://a.example/', vivExtData: stamped(NOW - 30 * 60_000) }]);
  const timer = new ManualTimer();
  const module = new TodayArchive({ now: (): number => NOW, repeat: timer.repeat });
  await module.start(context(tabs, new MemoryStorage(), headless(), { archiveAfterHours: 0 }));
  timer.tick();
  await settle();
  assert.deepEqual(tabs.removedIds(), []);
  module.stop();
});

test('Cmd/Ctrl+Shift+A toggles the panel and stop removes everything', async () => {
  const original = globalThis.MutationObserver;
  globalThis.MutationObserver = class {
    public observe(): void {}
    public disconnect(): void {}
  } as unknown as typeof MutationObserver;
  try {
    const dom = new TodayDocument();
    const bar = dom.list as DomNode & { getBoundingClientRect?: () => DOMRect };
    bar.getBoundingClientRect = (): DOMRect => ({ top: 0, left: 0, right: 240, bottom: 800 }) as DOMRect;
    const elements = new Map<string, DomNode>([
      ['#browser', dom.parent],
      ['#bar', dom.list],
      ['#tabs-container', dom.list],
    ]);
    dom.querySelector = ((selector: string): DomNode | null => elements.get(selector) ?? null) as typeof dom.querySelector;
    const module = new TodayArchive({ now: (): number => NOW, repeat: new ManualTimer().repeat, frames: immediateFrames });
    await module.start(context(new TodayTabs(TABS()), new MemoryStorage(), dom));
    assert.ok(dom.list.children.some((child) => child.hasAttribute('data-vivarcdi-archive-footer')));
    const press = (): void => dom.listeners.get('keydown')?.forEach((listener) => listener(event('keydown', { key: 'A', metaKey: true, shiftKey: true }) as unknown as Event));
    press();
    assert.ok(dom.panel());
    press();
    assert.equal(dom.panel(), undefined);
    press();
    module.stop();
    assert.equal(dom.panel(), undefined);
    assert.equal([...dom.listeners.values()].flat().length, 0);
    assert.ok(!dom.list.children.some((child) => child.hasAttribute('data-vivarcdi-archive-footer')));
  } finally {
    globalThis.MutationObserver = original;
  }
});
