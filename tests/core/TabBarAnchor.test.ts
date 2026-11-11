import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TabBarAnchor } from '../../src/core/TabBarAnchor.js';
import type { AnchorWatcher } from '../../src/core/TabBarAnchor.js';
import { DomDocument, asDocument, asElement } from './dom.js';

function setup(): { document: DomDocument; anchor: TabBarAnchor; changed: () => void; watched: () => Node | null } {
  const document = new DomDocument();
  let notify = (): void => undefined;
  let target: Node | null = null;
  const watch: AnchorWatcher = (watchedTarget, onChange) => {
    target = watchedTarget;
    notify = onChange;
    return () => undefined;
  };
  const anchor = new TabBarAnchor(asDocument(document), '.list', watch, { schedule: (run): void => run(), cancel: (): void => undefined });
  return { document, anchor, changed: () => notify(), watched: () => target };
}

test('puts sections above the tab list in order, whatever the order they arrive in', () => {
  const { document, anchor } = setup();
  const folders = document.createElement('div');
  const grid = document.createElement('div');
  anchor.add(asElement(folders), 20);
  anchor.add(asElement(grid), 10);
  const host = document.parent.children[0];
  assert.ok(host);
  assert.ok(host.hasAttribute('data-vivarcdi-anchor'));
  assert.equal(host.nextElementSibling, document.list);
  assert.deepEqual(host.children, [grid, folders]);
});

test('puts the host back when Vivaldi removes it', () => {
  const { document, anchor, changed } = setup();
  const section = document.createElement('div');
  anchor.add(asElement(section), 20);
  document.parent.children[0]?.remove();
  assert.equal(document.parent.children.length, 1);
  changed();
  assert.equal(document.parent.children[0]?.nextElementSibling, document.list);
  assert.equal(section.parentElement, document.parent.children[0]);
});

test('puts the host back when Vivaldi moves the tab list to a new container', () => {
  const { document, anchor, changed, watched } = setup();
  const section = document.createElement('div');
  anchor.add(asElement(section), 10);
  document.parent.remove();
  const container = document.createElement('div');
  container.append(document.list);
  changed();
  assert.equal(watched(), asDocument(document));
  assert.equal(container.children[0]?.hasAttribute('data-vivarcdi-anchor'), true);
  assert.equal(container.children[0]?.nextElementSibling, document.list);
  assert.equal(section.parentElement, container.children[0]);
});

test('removes the host with its last section', () => {
  const { document, anchor } = setup();
  const section = document.createElement('div');
  const remove = anchor.add(asElement(section), 20);
  remove();
  assert.deepEqual(document.parent.children, [document.list]);
});

test('refuses to add a section when the tab list is missing', () => {
  const { document, anchor } = setup();
  document.list.remove();
  assert.throws(() => anchor.add(asElement(document.createElement('div')), 20));
});
