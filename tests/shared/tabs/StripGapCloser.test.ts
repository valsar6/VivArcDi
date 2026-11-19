import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HIDDEN_ATTRIBUTE } from '../../../src/shared/tabs/HiddenTabMarker.js';
import { Logger } from '../../../src/core/support/Logger.js';
import { SelectorCatalog } from '../../../src/core/dom/SelectorCatalog.js';
import { StripGapCloser } from '../../../src/shared/tabs/StripGapCloser.js';

const SHIFT = '--vivarcdi-gap-shift';

class FakeElement {
  public attributes = new Set<string>();
  public children: FakeElement[] = [];
  public values = new Map<string, string>();
  public priorities = new Map<string, string>();
  public style = {
    getPropertyValue: (name: string): string => this.values.get(name) ?? '',
    getPropertyPriority: (name: string): string => this.priorities.get(name) ?? '',
    setProperty: (name: string, value: string, priority = ''): void => {
      this.values.set(name, value);
      this.priorities.set(name, priority);
    },
    removeProperty: (name: string): string => {
      this.values.delete(name);
      this.priorities.delete(name);
      return '';
    },
  };

  constructor(public selectorName = '') {}

  public shown = true;

  public get firstElementChild(): FakeElement | null {
    return this.children[0] ?? null;
  }

  public getClientRects(): unknown[] {
    return this.shown ? [{}] : [];
  }

  public hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  public matches(selector: string): boolean {
    return selector === this.selectorName;
  }

  public closest(selector: string): FakeElement | null {
    const marked = selector === `[${HIDDEN_ATTRIBUTE}]` && this.attributes.has(HIDDEN_ATTRIBUTE);
    return selector === 'strip' || marked ? this : null;
  }
}

class FakeDocument extends EventTarget {
  public pinned: FakeElement[] = [];

  constructor(private elements: Record<string, FakeElement | undefined>) {
    super();
  }

  public querySelectorAll(selector: string): FakeElement[] {
    return selector === 'pinned' ? this.pinned : [];
  }

  public querySelector(selector: string): FakeElement | null {
    return this.elements[selector] ?? null;
  }
}

function slot(offset: number, height: number, hidden = false): FakeElement {
  const element = new FakeElement();
  element.style.setProperty('--PositionY', `${offset}px`);
  element.style.setProperty('--Height', `${height}px`);
  if (hidden) {
    element.attributes.add(HIDDEN_ATTRIBUTE);
  }
  return element;
}

interface Setup {
  closer: StripGapCloser;
  document: FakeDocument;
  frame: FakeElement;
  frameRun: () => void;
  queue: Array<() => void>;
  slots: FakeElement[];
  strip: FakeElement;
  warnings: unknown[][];
}

function setUp(slots: FakeElement[], { withFrame = true, pinned = [] as FakeElement[] } = {}): Setup {
  const strip = new FakeElement('strip');
  strip.children = slots;
  const frame = new FakeElement('frame');
  frame.style.setProperty('max-height', '120px');
  const document = new FakeDocument({ strip, frame: withFrame ? frame : undefined });
  document.pinned = pinned;
  const queue: Array<() => void> = [];
  const warnings: unknown[][] = [];
  const log = new Logger('test', { info: (): void => undefined, error: (): void => undefined, warn: (...message: unknown[]): void => void warnings.push(message) });
  const timing = {
    schedule: (run: () => void): number => queue.push(run),
    cancel: (): void => undefined,
  };
  const selectors = new SelectorCatalog({ browser: 'browser', tabStrip: 'strip', tabStripFrame: 'frame', pinnedTab: 'pinned', separator: 'separator' }, 'test');
  const closer = new StripGapCloser(document as unknown as Document, selectors, { timing, log });
  closer.acquire();
  const frameRun = (): void => queue.splice(0).forEach((run) => run());
  return { closer, document, frame, frameRun, queue, slots, strip, warnings };
}

function send(document: EventTarget, type: string, target?: unknown): void {
  const event = new Event(type);
  Object.defineProperty(event, 'button', { value: 0 });
  Object.defineProperty(event, 'target', { value: target });
  document.dispatchEvent(event);
}

test('applies the corrections once per frame after changes of the strip', () => {
  const { closer, frame, frameRun, queue, slots } = setUp([slot(0, 40, true), slot(40, 40), slot(80, 40)]);
  closer.request();
  closer.request();
  closer.request();
  assert.equal(queue.length, 1);
  frameRun();
  assert.deepEqual(
    slots.map((node) => node.values.get(SHIFT)),
    [undefined, '40px', '40px'],
  );
  assert.deepEqual([frame.values.get('max-height'), frame.priorities.get('max-height')], ['80px', 'important']);
});

test('restores the offsets when a slot is shown again', () => {
  const { closer, frame, frameRun, slots } = setUp([slot(0, 40, true), slot(40, 40)]);
  closer.request();
  frameRun();
  slots[0]?.attributes.delete(HIDDEN_ATTRIBUTE);
  closer.request();
  frameRun();
  assert.deepEqual(
    slots.map((node) => node.values.has(SHIFT)),
    [false, false],
  );
  assert.deepEqual([frame.values.get('max-height'), frame.priorities.get('max-height')], ['120px', '']);
});

test('keeps the value Vivaldi writes to the strip frame between two passes', () => {
  const { closer, frame, frameRun } = setUp([slot(0, 40, true), slot(40, 40)]);
  closer.request();
  frameRun();
  frame.style.setProperty('max-height', '200px');
  closer.request();
  frameRun();
  assert.equal(frame.values.get('max-height'), '160px');
  closer.release();
  assert.equal(frame.values.get('max-height'), '200px');
});

test('leaves the offsets alone during a drag', () => {
  const { closer, document, frame, frameRun, slots } = setUp([slot(0, 40, true), slot(40, 40)]);
  closer.request();
  frameRun();
  send(document, 'mousedown', slots[1]);
  send(document, 'mousemove');
  assert.deepEqual([slots[1]?.values.has(SHIFT), frame.values.get('max-height')], [false, '120px']);
  closer.request();
  frameRun();
  assert.equal(slots[1]?.values.has(SHIFT), false);
  send(document, 'mouseup');
  frameRun();
  assert.deepEqual([slots[1]?.values.get(SHIFT), frame.values.get('max-height')], ['40px', '80px']);
});

test('keeps the offsets through a click on a slot', () => {
  const { document, frameRun, closer, slots } = setUp([slot(0, 40, true), slot(40, 40)]);
  closer.request();
  frameRun();
  send(document, 'mousedown', slots[1]);
  send(document, 'mouseup');
  assert.equal(slots[1]?.values.get(SHIFT), '40px');
});

test('leaves the strip untouched when the selectors do not match', () => {
  const { closer, frame, frameRun, slots, warnings } = setUp([slot(0, 40, true), slot(40, 40)], { withFrame: false });
  closer.request();
  frameRun();
  closer.request();
  frameRun();
  assert.deepEqual([slots[1]?.values.has(SHIFT), frame.values.get('max-height')], [false, '120px']);
  assert.equal(warnings.length, 1);
});

test('removes the corrections when the last user releases the closer', () => {
  const { closer, frame, frameRun, slots } = setUp([slot(0, 40, true), slot(40, 40)]);
  closer.acquire();
  closer.request();
  frameRun();
  closer.release();
  assert.equal(slots[1]?.values.get(SHIFT), '40px');
  closer.release();
  assert.deepEqual([slots[1]?.values.has(SHIFT), frame.values.get('max-height'), frame.priorities.get('max-height')], [false, '120px', '']);
});

test('shares one closer per document', () => {
  const document = new FakeDocument({});
  const selectors = new SelectorCatalog({}, 'test');
  const first = StripGapCloser.of(document as unknown as Document, selectors);
  assert.equal(StripGapCloser.of(document as unknown as Document, selectors), first);
  assert.notEqual(StripGapCloser.of(new FakeDocument({}) as unknown as Document, selectors), first);
});

function separator(offset: number, height: number): FakeElement {
  const element = slot(offset, height);
  element.selectorName = 'separator';
  return element;
}

test('hides the separator while no pinned tab is visible', () => {
  const { closer, frame, frameRun, slots } = setUp([separator(0, 20), slot(20, 40)]);
  closer.request();
  frameRun();
  assert.deepEqual([slots[0]?.values.get('display'), slots[0]?.priorities.get('display')], ['none', 'important']);
  assert.deepEqual([slots[1]?.values.get(SHIFT), frame.values.get('max-height')], ['20px', '100px']);
});

test('shows the separator when a pinned tab is visible', () => {
  const { closer, document, frame, frameRun, slots } = setUp([separator(0, 20), slot(20, 40)]);
  closer.request();
  frameRun();
  document.pinned = [new FakeElement('pinned')];
  closer.request();
  frameRun();
  assert.equal(slots[0]?.values.has('display'), false);
  assert.deepEqual([slots[1]?.values.has(SHIFT), frame.values.get('max-height')], [false, '120px']);
});

function wrapped(offset: number, height: number, hidden = false): FakeElement {
  const wrapper = new FakeElement();
  wrapper.children = [slot(offset, height)];
  if (hidden) {
    wrapper.attributes.add(HIDDEN_ATTRIBUTE);
  }
  return wrapper;
}

test('reads the offsets from the slot inside a wrapper', () => {
  const { closer, frame, frameRun, slots } = setUp([wrapped(0, 40, true), wrapped(40, 40)]);
  closer.request();
  frameRun();
  assert.deepEqual([slots[0]?.values.has(SHIFT), slots[1]?.values.get(SHIFT), frame.values.get('max-height')], [false, '40px', '80px']);
});

test('counts a pinned tab inside a collapsed group as not visible', () => {
  const collapsed = new FakeElement('pinned');
  collapsed.shown = false;
  const { closer, frameRun, slots } = setUp([separator(0, 20), slot(20, 40)], { pinned: [collapsed] });
  closer.request();
  frameRun();
  assert.equal(slots[0]?.values.get('display'), 'none');
});
