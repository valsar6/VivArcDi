import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PreviewPanelView } from '../../../src/modules/folderpreview/PreviewPanelView.js';
import type { PanelContent } from '../../../src/modules/folderpreview/PreviewPanelView.js';
import { PreviewRows } from '../../../src/modules/folderpreview/PreviewRows.js';
import type { PreviewRow } from '../../../src/modules/folderpreview/PreviewRows.js';
import { PreviewSession } from '../../../src/modules/folderpreview/PreviewSession.js';
import { PreviewText } from '../../../src/modules/folderpreview/PreviewText.js';
import { DomDocument, asDocument, asElement } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';

const link = (id: string): PreviewRow['link'] => ({ kind: 'link', id, title: `Link ${id}`, url: `https://${id}.example/`, key: `${id}.example`, depth: 0 });

const rect = { top: 100, left: 0, right: 240, bottom: 130 } as DOMRect;

function setup(): { dom: DomDocument; view: PreviewPanelView; activated: string[]; closed: number[]; content: PanelContent } {
  const dom = new DomDocument();
  dom.defaultView = { innerWidth: 1200, innerHeight: 800 };
  const activated: string[] = [];
  const closed: number[] = [];
  const parent = dom.createElement('div');
  const view = new PreviewPanelView(asDocument(dom), asElement(parent), {
    onActivate: (row): void => void activated.push(row.link.id),
    onClose: (): void => void closed.push(1),
  });
  const rows = PreviewRows.build([link('a'), link('b'), link('c')], { get: () => null });
  const content: PanelContent = { title: 'Hobbies', session: new PreviewSession(rows), texts: PreviewText.of('en'), locale: 'en', now: new Date() };
  return { dom, view, activated, closed, content };
}

function press(panel: DomNode, key: string): void {
  panel.bubble({ type: 'keydown', key, preventDefault: (): void => undefined, stopPropagation: (): void => undefined, target: panel } as unknown as Event);
}

const panelOf = (view: PreviewPanelView, dom: DomDocument): DomNode => {
  assert.ok(view.isOpen);
  const found = dom.createdPanel();
  assert.ok(found);
  return found;
};

test('activates the highlighted tab on Enter', () => {
  const { dom, view, activated, content } = setup();
  view.open(content, { row: rect, bar: rect });
  const panel = panelOf(view, dom);
  press(panel, 'ArrowDown');
  press(panel, 'ArrowDown');
  press(panel, 'Enter');
  assert.deepEqual(activated, ['c']);
});

test('closes on Escape and shows the search field with the focus', () => {
  const { dom, view, closed, content } = setup();
  view.open(content, { row: rect, bar: rect });
  const panel = panelOf(view, dom);
  assert.equal(panel.children[0]?.focused, true);
  assert.equal(panel.children[0]?.getAttribute('placeholder'), 'Search Hobbies…');
  press(panel, 'Escape');
  assert.equal(closed.length, 1);
  view.close();
  assert.equal(view.isOpen, false);
});

test('opens on the side away from the tab bar', () => {
  const { dom, view, content } = setup();
  view.open(content, { row: rect, bar: { left: 960, right: 1200, top: 0 } as DOMRect });
  const panel = panelOf(view, dom);
  assert.equal(panel.properties.get('right'), '240px');
  view.close();
  view.open(content, { row: rect, bar: rect });
  assert.equal(panelOf(view, dom).properties.get('left'), '240px');
});
