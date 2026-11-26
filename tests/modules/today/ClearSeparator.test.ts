import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SelectorCatalog } from '../../../src/core/dom/SelectorCatalog.js';
import { CLEAR_ATTRIBUTE, CLEAR_LINE_ATTRIBUTE, CLEAR_ROW_ATTRIBUTE, ClearSeparator } from '../../../src/modules/today/ClearSeparator.js';
import { HIDDEN_ATTRIBUTE } from '../../../src/shared/tabs/HiddenAttribute.js';
import { NO_TODAY_ATTRIBUTE, OWN_ROW_ATTRIBUTE, PINNED_LAST_ATTRIBUTE } from '../../../src/shared/tabs/TabBarMarks.js';
import { immediateFrames } from '../folders/fakes.js';
import { event } from '../pinned/fakes.js';

const MISSING_STRIP = 'The tab strip is missing: the Clear control is left to the archive panel';

const SELECTORS = new SelectorCatalog({ browser: '#browser', tabStrip: '#strip', pinnedTab: '.tab-position.is-pinned', tabWrapper: '.tab-wrapper' }, 'test');

const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

type Listener = (event: Event) => void;

class StripChild {
  public readonly attributes = new Set<string>();
  public readonly classes = new Set<string>();
  public readonly values = new Map<string, string>();
  public children: StripChild[] = [];
  public parent: StripChild | null = null;
  public dataset: Record<string, string> = {};
  public textContent = '';
  public readonly style = {
    getPropertyValue: (name: string): string => this.values.get(name) ?? '',
    setProperty: (name: string, value: string): void => void this.values.set(name, value),
  };

  constructor(public readonly tagName: string) {}

  public get firstElementChild(): StripChild | null {
    return this.children[0] ?? null;
  }

  public get nextElementSibling(): StripChild | null {
    const siblings = this.parent?.children ?? [];
    return siblings[siblings.indexOf(this) + 1] ?? null;
  }

  public append(...nodes: StripChild[]): void {
    nodes.forEach((node) => this.insertBefore(node, null));
  }

  public insertBefore(node: StripChild, before: StripChild | null): void {
    node.remove();
    node.parent = this;
    const index = before === null ? this.children.length : this.children.indexOf(before);
    this.children.splice(index < 0 ? this.children.length : index, 0, node);
  }

  public remove(): void {
    if (this.parent !== null) {
      this.parent.children = this.parent.children.filter((child) => child !== this);
      this.parent = null;
    }
  }

  public matches(selector: string): boolean {
    if (selector.startsWith('.')) {
      return selector
        .split('.')
        .filter((name) => name !== '')
        .every((name) => this.classes.has(name));
    }
    return this.hasAttribute(selector.slice(1, -1));
  }

  public closest(selector: string): StripChild | null {
    return this.matches(selector) ? this : (this.parent?.closest(selector) ?? null);
  }

  public querySelector(selector: string): StripChild | null {
    for (const child of this.children) {
      if (child.matches(selector)) {
        return child;
      }
      const found = child.querySelector(selector);
      if (found !== null) {
        return found;
      }
    }
    return null;
  }

  public setAttribute(name: string, value: string): void {
    this.attributes.add(name);
    this.values.set(name, value);
  }

  public removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  public hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  public toggleAttribute(name: string, force: boolean): void {
    if (force) {
      this.attributes.add(name);
    } else {
      this.attributes.delete(name);
    }
  }
}

class FakeDocument {
  public elements = new Map<string, StripChild | null>();
  public listeners = new Map<string, Listener[]>();

  public querySelector(selector: string): StripChild | null {
    return this.elements.get(selector) ?? null;
  }

  public createElement(tagName: string): StripChild {
    return new StripChild(tagName);
  }

  public addEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  public removeEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((candidate) => candidate !== listener));
  }

  public dispatch(type: string, target: unknown): ReturnType<typeof event> {
    const fired = event(type, { target });
    this.listeners.get(type)?.forEach((listener) => listener(fired as unknown as Event));
    return fired;
  }

  public count(): number {
    return [...this.listeners.values()].reduce((total, listeners) => total + listeners.length, 0);
  }
}

class Watcher {
  public targets: Node[] = [];
  #listeners = new Set<() => void>();

  public readonly watch = (target: Node, onChange: () => void): (() => void) => {
    this.targets.push(target);
    this.#listeners.add(onChange);
    return () => this.#listeners.delete(onChange);
  };

  public change(): void {
    this.#listeners.forEach((listener) => listener());
  }

  public get count(): number {
    return this.#listeners.size;
  }
}

interface Setup {
  separator: ClearSeparator;
  document: FakeDocument;
  strip: StripChild;
  slot: StripChild;
  watcher: Watcher;
  cleared: number[];
  warnings: string[];
}

interface SetupOptions {
  withStrip?: boolean;
  pinnedLast?: StripChild | null;
  shift?: string;
}

function todaySlot(id: number, offset: number, options: { shift?: string; pinned?: boolean } = {}): StripChild {
  const slot = new StripChild('div');
  slot.classes.add('tab-position');
  if (options.pinned === true) {
    slot.classes.add('is-pinned');
  }
  const wrapper = new StripChild('div');
  wrapper.classes.add('tab-wrapper');
  wrapper.dataset['id'] = `tab-${id}`;
  slot.append(wrapper);
  slot.style.setProperty('--PositionY', `${offset}px`);
  slot.style.setProperty('--Height', '40px');
  if (options.shift !== undefined) {
    slot.style.setProperty('--vivarcdi-gap-shift', options.shift);
  }
  return slot;
}

function setUp({ withStrip = true, pinnedLast = null, shift = '4px' }: SetupOptions = {}): Setup {
  const document = new FakeDocument();
  const browser = new StripChild('div');
  document.elements.set('#browser', browser);
  const strip = new StripChild('div');
  const slot = todaySlot(7, 40, { shift });
  strip.append(slot);
  document.elements.set('#strip', withStrip ? strip : null);
  document.elements.set(`[${PINNED_LAST_ATTRIBUTE}]`, pinnedLast);
  const watcher = new Watcher();
  const cleared: number[] = [];
  const warnings: string[] = [];
  const logger = { warn: (...message: unknown[]): void => void warnings.push(String(message[0])) };
  const separator = new ClearSeparator({
    document: document as unknown as Document,
    selectors: SELECTORS,
    onClear: (): void => void cleared.push(1),
    logger,
    watch: watcher.watch,
    timing: immediateFrames,
  });
  return { separator, document, strip, slot, watcher, cleared, warnings };
}

function rowOf(strip: StripChild): StripChild | null {
  return strip.children.find((child) => child.hasAttribute(CLEAR_ROW_ATTRIBUTE)) ?? null;
}

test('keeps the Clear control out of the hidden pinned group', async () => {
  const setup = setUp();
  const group = new StripChild('span');
  group.classes.add('pinned-group');
  const pinned = todaySlot(3, 0, { pinned: true });
  pinned.setAttribute(PINNED_LAST_ATTRIBUTE, '');
  pinned.setAttribute(HIDDEN_ATTRIBUTE, '');
  group.append(pinned);
  setup.strip.insertBefore(group, setup.slot);
  setup.separator.start();
  await settle();
  const row = rowOf(setup.strip);
  assert.ok(row);
  assert.equal(row.parent, setup.strip);
  assert.equal(row.closest(`[${PINNED_LAST_ATTRIBUTE}]`), null);
  assert.equal(row.closest('.pinned-group'), null);
  assert.ok(row.hasAttribute(OWN_ROW_ATTRIBUTE));
  const clear = row.children[0];
  assert.ok(clear);
  assert.ok(clear.hasAttribute(CLEAR_ATTRIBUTE));
  setup.separator.stop();
});

test('puts the Clear control above the Today tabs and takes its clicks', async () => {
  const setup = setUp({ shift: '4px' });
  setup.separator.start();
  await settle();
  const row = rowOf(setup.strip);
  assert.ok(row);
  assert.equal(row.parent, setup.strip);
  assert.equal(row.nextElementSibling, setup.slot);
  assert.equal(row.values.get('--PositionY'), '27px');
  assert.equal(row.values.get('--vivarcdi-gap-shift'), '4px');
  const clear = row.children[0];
  assert.ok(clear);
  const down = setup.document.dispatch('mousedown', clear);
  assert.equal(down.stopped, true);
  assert.deepEqual(setup.cleared, []);
  const click = setup.document.dispatch('click', clear);
  assert.equal(click.stopped, true);
  assert.deepEqual(setup.cleared, [1]);
  setup.document.dispatch('click', setup.slot);
  assert.deepEqual(setup.cleared, [1]);
  row.remove();
  setup.slot.style.setProperty('--PositionY', '80px');
  setup.watcher.change();
  await settle();
  assert.equal(rowOf(setup.strip), row);
  assert.equal(row.parent, setup.strip);
  assert.equal(row.values.get('--PositionY'), '67px');
  setup.separator.stop();
  assert.equal(row.parent, null);
  assert.equal(setup.watcher.count, 0);
  assert.equal(setup.document.count(), 0);
});

test('draws its line only when no pinned row shows it', async () => {
  const marked = todaySlot(3, 0, { pinned: true });
  marked.setAttribute(PINNED_LAST_ATTRIBUTE, '');
  const setup = setUp({ pinnedLast: marked });
  setup.separator.start();
  await settle();
  const row = rowOf(setup.strip);
  assert.ok(row);
  assert.equal(row.hasAttribute(CLEAR_LINE_ATTRIBUTE), false);
  marked.setAttribute(HIDDEN_ATTRIBUTE, '');
  setup.watcher.change();
  await settle();
  assert.equal(row.hasAttribute(CLEAR_LINE_ATTRIBUTE), true);
  marked.removeAttribute(HIDDEN_ATTRIBUTE);
  setup.watcher.change();
  await settle();
  assert.equal(row.hasAttribute(CLEAR_LINE_ATTRIBUTE), false);
  setup.document.elements.set(`[${PINNED_LAST_ATTRIBUTE}]`, null);
  setup.watcher.change();
  await settle();
  assert.equal(row.hasAttribute(CLEAR_LINE_ATTRIBUTE), true);
  setup.separator.stop();
});

test('hides the Clear line while there is no Today tab', async () => {
  const setup = setUp();
  const browser = setup.document.elements.get('#browser') as StripChild;
  setup.slot.remove();
  setup.separator.start();
  await settle();
  assert.equal(rowOf(setup.strip), null);
  assert.equal(setup.strip.children.some((child) => child.hasAttribute(CLEAR_LINE_ATTRIBUTE)), false);
  assert.equal(browser.hasAttribute(NO_TODAY_ATTRIBUTE), true);
  setup.separator.stop();
  assert.equal(browser.hasAttribute(NO_TODAY_ATTRIBUTE), false);
});

test('shows the Clear line when a Today tab opens', async () => {
  const setup = setUp();
  const browser = setup.document.elements.get('#browser') as StripChild;
  setup.slot.remove();
  setup.separator.start();
  await settle();
  assert.equal(browser.hasAttribute(NO_TODAY_ATTRIBUTE), true);
  setup.strip.append(setup.slot);
  setup.watcher.change();
  await settle();
  const row = rowOf(setup.strip);
  assert.ok(row);
  assert.equal(row.hasAttribute(CLEAR_LINE_ATTRIBUTE), true);
  assert.equal(browser.hasAttribute(NO_TODAY_ATTRIBUTE), false);
  setup.slot.remove();
  setup.watcher.change();
  await settle();
  assert.equal(rowOf(setup.strip), null);
  assert.equal(browser.hasAttribute(NO_TODAY_ATTRIBUTE), true);
  setup.separator.stop();
});

test('ignores hidden and linked tabs for the Clear line', async () => {
  const setup = setUp();
  const browser = setup.document.elements.get('#browser') as StripChild;
  setup.slot.remove();
  const linked = todaySlot(8, 80, { pinned: true });
  const group = new StripChild('span');
  group.classes.add('pinned-group');
  group.append(todaySlot(9, 120, { pinned: true }));
  const hidden = todaySlot(10, 160);
  hidden.setAttribute(HIDDEN_ATTRIBUTE, '');
  setup.strip.append(linked, group, hidden);
  setup.separator.start();
  await settle();
  assert.equal(rowOf(setup.strip), null);
  assert.equal(browser.hasAttribute(NO_TODAY_ATTRIBUTE), true);
  const visible = todaySlot(11, 200);
  setup.strip.append(visible);
  setup.watcher.change();
  await settle();
  const row = rowOf(setup.strip);
  assert.ok(row);
  assert.equal(row.nextElementSibling, visible);
  assert.equal(browser.hasAttribute(NO_TODAY_ATTRIBUTE), false);
  setup.separator.stop();
});

test('warns once when the tab strip is missing', () => {
  const setup = setUp({ withStrip: false });
  setup.separator.start();
  setup.separator.sync();
  setup.separator.sync();
  assert.deepEqual(setup.warnings, [MISSING_STRIP]);
  assert.equal(rowOf(setup.strip), null);
  setup.separator.stop();
  assert.equal(setup.watcher.count, 0);
  assert.equal(setup.document.count(), 0);
});
