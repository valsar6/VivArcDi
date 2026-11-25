import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SidebarBox } from '../../../src/modules/littlearc/SidebarBox.js';
import { SidebarPlacement } from '../../../src/modules/littlearc/SidebarPlacement.js';
import { WindowBounds } from '../../../src/modules/littlearc/WindowBounds.js';

const SIDEBAR_SELECTOR = '#tabs-tabbar-container:is(.left, .right)';
const screen = { width: 1000, height: 800, left: 0, top: 0 };
const size = { widthPercent: 50, heightPercent: 50 };

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface MeasuredRect extends Rect {
  width: number;
  height: number;
}

function documentWith(rect: Rect | null): { document: Document; selectors: string[] } {
  const selectors: string[] = [];
  const element = rect === null
    ? null
    : { getBoundingClientRect: (): MeasuredRect => ({ ...rect, width: rect.right - rect.left, height: rect.bottom - rect.top }) };
  const document = {
    defaultView: { screenX: 20, screenY: 10 },
    querySelector: (selector: string): unknown => (selectors.push(selector), element),
  } as unknown as Document;
  return { document, selectors };
}

test('places the Little Arc window clear of the sidebar', () => {
  const { document, selectors } = documentWith({ left: 0, right: 240, top: 0, bottom: 800 });
  const sidebar = SidebarBox.read(document, SIDEBAR_SELECTOR);
  assert.deepEqual(sidebar, new SidebarBox(20, 260, 10, 810));
  const placement = new SidebarPlacement();
  const result = placement.beside(sidebar, screen, size);
  assert.deepEqual(result?.bounds, { width: 500, height: 400, left: 272, top: 200 });
  assert.equal(result?.shrunk, false);
  assert.equal(placement.overlaps(sidebar, result?.bounds ?? { width: 0, height: 0, left: 0, top: 0 }), false);
  assert.deepEqual(selectors, [SIDEBAR_SELECTOR]);
});

test('places Little Arc beside the rendered sidebar', () => {
  const placement = new SidebarPlacement();
  const near = documentWith({ left: 0, right: 240, top: 0, bottom: 800 });
  const far = documentWith({ left: 60, right: 300, top: 0, bottom: 800 });
  assert.equal(placement.beside(SidebarBox.read(near.document, SIDEBAR_SELECTOR), screen, size)?.bounds.left, 272);
  assert.equal(placement.beside(SidebarBox.read(far.document, SIDEBAR_SELECTOR), screen, size)?.bounds.left, 332);
  assert.deepEqual(near.selectors, [SIDEBAR_SELECTOR]);
  assert.deepEqual(far.selectors, [SIDEBAR_SELECTOR]);
});

test('falls back when the sidebar leaves no room beside it', () => {
  const { document } = documentWith({ left: 460, right: 500, top: 0, bottom: 800 });
  const sidebar = SidebarBox.read(document, SIDEBAR_SELECTOR);
  const result = new SidebarPlacement().beside(sidebar, screen, { widthPercent: 60, heightPercent: 50 });
  assert.deepEqual(result?.bounds, { width: 468, height: 400, left: 532, top: 200 });
  assert.equal(result?.shrunk, true);
});

test('centres Little Arc when the sidebar cannot be read', () => {
  const { document } = documentWith(null);
  const sidebar = SidebarBox.read(document, SIDEBAR_SELECTOR);
  assert.equal(sidebar, null);
  assert.equal(new SidebarPlacement().beside(sidebar, screen, size), null);
  assert.deepEqual(WindowBounds.centred(screen, size), { width: 500, height: 400, left: 250, top: 200 });
});
