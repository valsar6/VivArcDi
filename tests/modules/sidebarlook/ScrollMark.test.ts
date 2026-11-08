import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCROLLING_ATTRIBUTE, SCROLL_MARK_MS, ScrollMark } from '../../../src/modules/sidebarlook/ScrollMark.js';
import type { ScrollTimers } from '../../../src/modules/sidebarlook/ScrollMark.js';
import { asDocument, DomDocument, DomNode } from '../../core/dom.js';

class ManualTimers implements ScrollTimers {
  public pending = new Map<number, { run: () => void; delayMs: number }>();
  #next = 1;

  public set(run: () => void, delayMs: number): number {
    this.pending.set(this.#next, { run, delayMs });
    return this.#next++;
  }

  public clear(handle: unknown): void {
    this.pending.delete(handle as number);
  }

  public fire(): void {
    const [first] = [...this.pending.entries()];
    if (first !== undefined) {
      this.pending.delete(first[0]);
      first[1].run();
    }
  }
}

class ScrollNode extends DomNode {
  public inTabBar: boolean;

  constructor(document: DomDocument, inTabBar: boolean) {
    super('div', document);
    this.inTabBar = inTabBar;
  }

  public override closest(selector: string): DomNode | null {
    return this.inTabBar && selector === '#bar' ? this : null;
  }
}

function setup(): { document: DomDocument; timers: ManualTimers; mark: ScrollMark } {
  const document = new DomDocument();
  const timers = new ManualTimers();
  const mark = new ScrollMark(asDocument(document), '#bar', timers);
  mark.start();
  return { document, timers, mark };
}

const scroll = (document: DomDocument, target: DomNode): void => document.emit('scroll', { target });

test('marks the scrolling element of the tab bar and clears the mark 800 ms after the last scroll', () => {
  const { document, timers } = setup();
  const list = new ScrollNode(document, true);
  scroll(document, list);
  assert.ok(list.hasAttribute(SCROLLING_ATTRIBUTE));
  assert.equal([...timers.pending.values()][0]?.delayMs, SCROLL_MARK_MS);
  scroll(document, list);
  assert.equal(timers.pending.size, 1);
  timers.fire();
  assert.equal(list.hasAttribute(SCROLLING_ATTRIBUTE), false);
});

test('ignores scrolls outside the tab bar', () => {
  const { document, timers } = setup();
  const page = new ScrollNode(document, false);
  scroll(document, page);
  assert.equal(page.hasAttribute(SCROLLING_ATTRIBUTE), false);
  assert.equal(timers.pending.size, 0);
});

test('stop removes the marks and the listener', () => {
  const { document, timers, mark } = setup();
  const list = new ScrollNode(document, true);
  scroll(document, list);
  mark.stop();
  assert.equal(list.hasAttribute(SCROLLING_ATTRIBUTE), false);
  assert.equal(timers.pending.size, 0);
  assert.equal(document.listeners.get('scroll')?.length, 0);
});
