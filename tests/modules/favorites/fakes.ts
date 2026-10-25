import { SelectorCatalog } from '../../../src/core/SelectorCatalog.js';
import type { TabUpdateListener } from '../../../src/core/BrowserTabs.js';

export const selectors = new SelectorCatalog(
  {
    browser: '#browser',
    tabBar: '#tabs-tabbar-container',
    verticalTabBar: 'vertical',
    tabStrip: 'strip',
    pinnedTab: 'pinned',
    tabWrapper: 'wrapper',
  },
  'test',
);

export class FakeNode {
  public selectorNames: Set<string>;
  public attributes = new Map<string, string>();
  public dataset: Record<string, string> = {};
  public properties = new Map<string, string>();
  public clientWidth = 0;
  public children: FakeNode[];
  public parent: FakeNode | null = null;
  public style = {
    setProperty: (name: string, value: string): Map<string, string> => this.properties.set(name, value),
    removeProperty: (name: string): boolean => this.properties.delete(name),
  };

  constructor(selectorNames: string[] = [], children: FakeNode[] = []) {
    this.selectorNames = new Set(selectorNames);
    this.children = children;
    children.forEach((child) => {
      child.parent = this;
    });
  }

  public matches(selector: string): boolean {
    return this.selectorNames.has(selector);
  }

  public querySelector(selector: string): FakeNode | null {
    for (const child of this.children) {
      if (child.matches(selector)) {
        return child;
      }
      const nested = child.querySelector(selector);
      if (nested) {
        return nested;
      }
    }
    return null;
  }

  public closest(selector: string): FakeNode | null {
    if (selector.startsWith('[') && this.hasAttribute(selector.slice(1, -1))) {
      return this;
    }
    return this.parent?.closest(selector) ?? null;
  }

  public hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  public toggleAttribute(name: string, force: boolean): boolean {
    if (force) {
      this.attributes.set(name, '');
    } else {
      this.attributes.delete(name);
    }
    return force;
  }

  public removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
}

export function tabSlot(tabId: number, { pinned = false } = {}): FakeNode {
  const wrapper = new FakeNode(['wrapper']);
  wrapper.dataset['id'] = `tab-${tabId}`;
  return new FakeNode([], [new FakeNode(pinned ? ['pinned'] : [], [wrapper])]);
}

export function tabBar({ vertical = true, slots = [] as FakeNode[] } = {}): { bar: FakeNode; strip: FakeNode } {
  const strip = new FakeNode(['strip'], slots);
  return { bar: new FakeNode(vertical ? ['vertical'] : [], [strip]), strip };
}

export function asElement(node: FakeNode): HTMLElement {
  return node as unknown as HTMLElement;
}

export type FakeTab = Partial<chrome.tabs.Tab> & { id: number };

export class FakeTabs {
  public tabs: Map<number, FakeTab>;
  public calls: Array<[string, ...unknown[]]> = [];
  public listeners = new Set<TabUpdateListener>();
  public available = true;

  constructor(tabs: FakeTab[] = []) {
    this.tabs = new Map(tabs.map((tab) => [tab.id, { ...tab }]));
  }

  public async get(tabId: number): Promise<chrome.tabs.Tab> {
    return { ...this.tabs.get(tabId) } as chrome.tabs.Tab;
  }

  public async query(info: Record<string, unknown>): Promise<chrome.tabs.Tab[]> {
    this.calls.push(['query', info]);
    const matching = [...this.tabs.values()].filter((tab) =>
      Object.entries(info).every(([key, value]) => (tab as Record<string, unknown>)[key] === value),
    );
    return matching as chrome.tabs.Tab[];
  }

  public async activate(tabId: number): Promise<chrome.tabs.Tab> {
    this.calls.push(['activate', tabId]);
    return this.get(tabId);
  }

  public async discard(tabId: number): Promise<chrome.tabs.Tab> {
    this.calls.push(['discard', tabId]);
    return this.get(tabId);
  }

  public onUpdated(listener: TabUpdateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public emit(tabId: number, change: chrome.tabs.OnUpdatedInfo): void {
    const tab = { ...this.tabs.get(tabId), ...change } as FakeTab;
    this.tabs.set(tabId, tab);
    this.listeners.forEach((listener) => listener(tabId, change, tab as chrome.tabs.Tab));
  }
}
