import type { TabActivatedListener, TabCreatedListener } from '../../../src/core/BrowserTabs.js';
import { Logger } from '../../../src/core/Logger.js';
import { SilentSink } from '../../loader/fakes.js';
import { FakeTabs } from '../favorites/fakes.js';
import type { FakeTab } from '../favorites/fakes.js';

export const silentLogger = (): Logger => new Logger('test', new SilentSink());

export const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

export class ReopenTabs extends FakeTabs {
  public createdListeners = new Set<TabCreatedListener>();
  public activatedListeners = new Set<TabActivatedListener>();
  public failing = new Set<string>();

  public override async activate(tabId: number): Promise<chrome.tabs.Tab> {
    if (this.failing.has('activate')) {
      throw new Error('activate failed');
    }
    return super.activate(tabId);
  }

  public async reload(tabId: number): Promise<void> {
    this.calls.push(['reload', tabId]);
  }

  public async remove(tabId: number): Promise<void> {
    this.calls.push(['remove', tabId]);
    this.tabs.delete(tabId);
  }

  public onCreated(listener: TabCreatedListener): () => void {
    this.createdListeners.add(listener);
    return () => this.createdListeners.delete(listener);
  }

  public onActivated(listener: TabActivatedListener): () => void {
    this.activatedListeners.add(listener);
    return () => this.activatedListeners.delete(listener);
  }

  public create(tab: FakeTab): void {
    this.tabs.set(tab.id, { ...tab });
    this.createdListeners.forEach((listener) => listener({ ...tab } as chrome.tabs.Tab));
  }

  public activateByUser(tabId: number): void {
    this.activatedListeners.forEach((listener) => listener({ tabId, windowId: 1 }));
  }

  public actions(): Array<[string, ...unknown[]]> {
    return this.calls.filter(([name]) => name !== 'query');
  }
}

export class MemoryStorage {
  public items = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}
