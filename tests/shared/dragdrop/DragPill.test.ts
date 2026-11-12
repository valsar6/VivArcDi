import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRAG_PILL_ATTRIBUTE, DragPill } from '../../../src/shared/dragdrop/DragPill.js';
import { asDocument, DomDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';

interface Setup {
  dom: DomDocument;
  pill: DragPill;
  flush: () => void;
  element: () => DomNode | undefined;
}

function setup(): Setup {
  const dom = new DomDocument();
  dom.list.rect = { left: 0, right: 300, top: 0, bottom: 600 };
  const frames: Array<() => void> = [];
  const pill = new DragPill({
    document: asDocument(dom),
    parentSelector: '#browser',
    tabBarSelector: '#bar',
    timing: { schedule: (run): number => frames.push(run), cancel: (): void => void frames.splice(0) },
  });
  return {
    dom,
    pill,
    flush: (): void => void frames.splice(0).forEach((run) => run()),
    element: (): DomNode | undefined => dom.created.find((node) => node.hasAttribute(DRAG_PILL_ATTRIBUTE)),
  };
}

test('draws the pill with the title and follows the pointer once for each frame', () => {
  const { pill, flush, element } = setup();
  pill.show({ title: 'Example', iconUrl: 'chrome://favicon/a' }, 40, 50);
  pill.move(60, 70);
  pill.move(80, 90);
  flush();
  const drawn = element();
  assert.equal(drawn?.parentElement === null, false);
  assert.equal(drawn?.descendants().find((node) => node.tagName === 'SPAN')?.textContent, 'Example');
  assert.equal(drawn?.descendants().find((node) => node.tagName === 'IMG')?.getAttribute('src'), 'chrome://favicon/a');
  assert.equal(drawn?.properties.get('transform'), 'translate(92px, 102px)');
  assert.equal(drawn?.hasAttribute('hidden'), false);
});

test('draws no icon for a page that has none', () => {
  const { pill, element } = setup();
  pill.show({ title: 'Example', iconUrl: null }, 1, 1);
  assert.equal(element()?.descendants().some((node) => node.tagName === 'IMG'), false);
});

test('hides the pill while the pointer is outside the tab bar', () => {
  const { pill, flush, element } = setup();
  pill.show({ title: 'Example', iconUrl: null }, 40, 50);
  flush();
  assert.equal(element()?.hasAttribute('hidden'), false);
  pill.move(400, 50);
  flush();
  assert.equal(element()?.hasAttribute('hidden'), true);
  pill.move(100, 50);
  flush();
  assert.equal(element()?.hasAttribute('hidden'), false);
});

test('removes the pill on hide and ignores a frame that was waiting', () => {
  const { pill, flush, element } = setup();
  pill.show({ title: 'Example', iconUrl: null }, 40, 50);
  pill.hide();
  flush();
  assert.equal(element()?.parentElement, null);
});

test('replaces the pill when another page is shown', () => {
  const { dom, pill } = setup();
  pill.show({ title: 'One', iconUrl: null }, 1, 1);
  pill.show({ title: 'Two', iconUrl: null }, 1, 1);
  assert.equal(dom.created.filter((node) => node.hasAttribute(DRAG_PILL_ATTRIBUTE) && node.parentElement !== null).length, 1);
});

test('shares one pill for each window', () => {
  const selectors = { get: (name: string): string => `#${name}` };
  const dom = asDocument(new DomDocument());
  assert.equal(DragPill.of(dom, selectors), DragPill.of(dom, selectors));
  assert.notEqual(DragPill.of(dom, selectors), DragPill.of(asDocument(new DomDocument()), selectors));
});

test('reads the title and the icon of a row', () => {
  const dom = new DomDocument();
  const row = dom.createElement('div');
  row.setAttribute('title', 'Example');
  assert.deepEqual(DragPill.contentOf(row as unknown as Element), { title: 'Example', iconUrl: null });
  const icon = { getAttribute: (): string => 'chrome://favicon/a' };
  assert.deepEqual(DragPill.contentOf({ getAttribute: (): string => 'T', querySelector: (): unknown => icon } as unknown as Element), { title: 'T', iconUrl: 'chrome://favicon/a' });
});
