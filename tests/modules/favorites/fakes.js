import { SelectorCatalog } from '../../../src/core/SelectorCatalog.js';

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
  constructor(selectorNames = [], children = []) {
    this.selectorNames = new Set(selectorNames);
    this.attributes = new Map();
    this.dataset = {};
    this.properties = new Map();
    this.style = {
      setProperty: (name, value) => this.properties.set(name, value),
      removeProperty: (name) => this.properties.delete(name),
    };
    this.clientWidth = 0;
    this.children = children;
    children.forEach((child) => {
      child.parent = this;
    });
    this.parent = null;
  }

  matches(selector) {
    return this.selectorNames.has(selector);
  }

  querySelector(selector) {
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

  closest(selector) {
    if (selector.startsWith('[') && this.hasAttribute(selector.slice(1, -1))) {
      return this;
    }
    return this.parent?.closest(selector) ?? null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  toggleAttribute(name, force) {
    if (force) {
      this.attributes.set(name, '');
    } else {
      this.attributes.delete(name);
    }
    return force;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }
}

export function tabSlot(tabId, { pinned = false } = {}) {
  const wrapper = new FakeNode(['wrapper']);
  wrapper.dataset.id = `tab-${tabId}`;
  return new FakeNode([], [new FakeNode(pinned ? ['pinned'] : [], [wrapper])]);
}

export function tabBar({ vertical = true, slots = [] } = {}) {
  const strip = new FakeNode(['strip'], slots);
  return { bar: new FakeNode(vertical ? ['vertical'] : [], [strip]), strip };
}

export class FakeTabs {
  constructor(tabs = []) {
    this.tabs = new Map(tabs.map((tab) => [tab.id, { ...tab }]));
    this.calls = [];
    this.listeners = new Set();
    this.available = true;
  }

  async get(tabId) {
    return { ...this.tabs.get(tabId) };
  }

  async query(info) {
    this.calls.push(['query', info]);
    return [...this.tabs.values()].filter((tab) =>
      Object.entries(info).every(([key, value]) => tab[key] === value),
    );
  }

  async activate(tabId) {
    this.calls.push(['activate', tabId]);
  }

  async discard(tabId) {
    this.calls.push(['discard', tabId]);
  }

  onUpdated(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(tabId, change) {
    const tab = { ...this.tabs.get(tabId), ...change };
    this.tabs.set(tabId, tab);
    this.listeners.forEach((listener) => listener(tabId, change, tab));
  }
}
