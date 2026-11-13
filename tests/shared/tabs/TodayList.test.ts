import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TODAY_ATTRIBUTE, TodayList } from '../../../src/shared/tabs/TodayList.js';

const WRAPPER = '.wrapper';
const STRIP = '.strip';
const SKIP = '.skip';

class Element {
  public attributes = new Set<string>();
  public wrapperOf: { dataset: { id: string } } | null = null;

  constructor(public inStrip: Element | null) {}

  public closest(selector: string): unknown {
    if (selector === STRIP) {
      return this.inStrip;
    }
    return selector === WRAPPER ? this.wrapperOf : null;
  }

  public querySelector(): null {
    return null;
  }

  public setAttribute(name: string): void {
    this.attributes.add(name);
  }

  public removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
}

function setup(): { list: TodayList; strip: Element; row: Element; empty: Element; outside: Element; pointer: { over: Element | null } } {
  const strip = new Element(null);
  strip.inStrip = strip;
  const row = new Element(strip);
  const wrapper = { dataset: { id: 'tab-12' }, closest: (): unknown => wrapper, querySelector: (): null => null };
  row.wrapperOf = wrapper;
  Object.assign(row, { closest: (selector: string): unknown => (selector === WRAPPER ? wrapper : strip), querySelector: (): unknown => wrapper });
  const empty = new Element(strip);
  const outside = new Element(null);
  const pointer: { over: Element | null } = { over: null };
  const list = new TodayList({ document: { elementFromPoint: (): globalThis.Element | null => pointer.over as unknown as globalThis.Element | null, querySelectorAll: ((): unknown[] => []) as unknown as Document['querySelectorAll'] }, stripSelector: STRIP, wrapperSelector: WRAPPER, skipSelector: SKIP });
  return { list, strip, row, empty, outside, pointer };
}

test('finds the tab of the row under the pointer', () => {
  const { list, row, pointer } = setup();
  pointer.over = row;
  assert.deepEqual(list.at(1, 1), { rowTabId: 12 });
});

test('finds the list without a row under the pointer', () => {
  const { list, empty, pointer } = setup();
  pointer.over = empty;
  assert.deepEqual(list.at(1, 1), { rowTabId: null });
});

test('finds nothing outside the tab list', () => {
  const { list, outside, pointer } = setup();
  pointer.over = outside;
  assert.equal(list.at(1, 1), null);
  pointer.over = null;
  assert.equal(list.at(1, 1), null);
});

test('marks the tab list while the pointer is over it and clears the mark', () => {
  const { list, strip, row, outside, pointer } = setup();
  pointer.over = row;
  list.mark(1, 1);
  list.mark(2, 2);
  assert.equal(strip.attributes.has(TODAY_ATTRIBUTE), true);
  pointer.over = outside;
  list.mark(3, 3);
  assert.equal(strip.attributes.has(TODAY_ATTRIBUTE), false);
  pointer.over = row;
  list.mark(1, 1);
  list.clear();
  assert.equal(strip.attributes.has(TODAY_ATTRIBUTE), false);
});

const rowWith = (id: number, skipped: boolean): unknown => {
  const wrapper = { dataset: { id: `tab-${id}` }, closest: (selector: string): unknown => (selector === WRAPPER ? wrapper : null), querySelector: (): null => null };
  return { ...wrapper, closest: (selector: string): unknown => (selector === SKIP ? (skipped ? wrapper : null) : wrapper) };
};

const listOf = (rows: unknown[]): TodayList =>
  new TodayList({
    document: { elementFromPoint: (): null => null, querySelectorAll: ((): unknown[] => rows) as unknown as Document['querySelectorAll'] },
    stripSelector: STRIP,
    wrapperSelector: WRAPPER,
    skipSelector: SKIP,
  });

test('finds the first row that is not hidden or pinned', () => {
  assert.deepEqual(listOf([rowWith(3, true), rowWith(5, false), rowWith(6, false)]).first(), { rowTabId: 5 });
});

test('finds no row at the top of an empty list', () => {
  assert.deepEqual(listOf([rowWith(3, true)]).first(), { rowTabId: null });
  assert.deepEqual(listOf([]).first(), { rowTabId: null });
});

test('names the slots that are not today tabs', () => {
  assert.equal(TodayList.skippedBy({ get: (name) => `.${name}`, has: () => true }), '[data-vivarcdi-hidden], .pinnedTab, .pinnedGroup');
});

test('names only the hidden slots when the catalog has no pinned selectors', () => {
  assert.equal(TodayList.skippedBy({ get: (name) => `.${name}`, has: () => false }), '[data-vivarcdi-hidden]');
});
