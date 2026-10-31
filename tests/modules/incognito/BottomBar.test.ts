import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BarButton } from '../../../src/modules/incognito/BarButton.js';
import { BottomBar } from '../../../src/modules/incognito/BottomBar.js';
import { asDocument } from '../../core/dom.js';
import { immediateFrames } from '../folders/fakes.js';
import { TodayDocument } from '../today/fakes.js';

function setup(): { dom: TodayDocument; bar: BottomBar; clicks: string[]; change: () => void } {
  const dom = new TodayDocument();
  const clicks: string[] = [];
  let change = (): void => undefined;
  const document = asDocument(dom);
  const buttons = [
    new BarButton(document, { name: 'library', title: 'Library', text: '', onClick: (): void => void clicks.push('library') }),
    new BarButton(document, { name: 'plus', title: 'New tab', text: '+', onClick: (): void => void clicks.push('plus') }),
  ];
  const watch = (_target: Node, onChange: () => void): (() => void) => {
    change = onChange;
    return () => undefined;
  };
  const bar = new BottomBar(document, '#tabs-container', buttons, { root: dom.parent as unknown as Node, watch, timing: immediateFrames });
  return { dom, bar, clicks, change: () => change() };
}

test('keeps the bottom bar at the end of the tab container, library first and plus last', () => {
  const { dom, bar, clicks } = setup();
  bar.start();
  const footer = dom.list.children.at(-1);
  assert.ok(footer);
  assert.ok(footer.hasAttribute('data-vivarcdi-bottom-bar'));
  assert.deepEqual(footer.children.map((button) => button.getAttribute('data-vivarcdi-bar-button')), ['library', 'plus']);
  assert.deepEqual(footer.children.map((button) => button.getAttribute('title')), ['Library', 'New tab']);
  assert.equal(footer.children[1]?.textContent, '+');
  footer.children.forEach((button) => button.click());
  assert.deepEqual(clicks, ['library', 'plus']);
});

test('puts the bottom bar back after Vivaldi adds a row and removes it on stop', async () => {
  const { dom, bar, change } = setup();
  bar.start();
  const footer = dom.list.children.at(-1);
  dom.list.append(dom.createElement('div'));
  change();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(dom.list.children.at(-1), footer);
  bar.stop();
  assert.equal(footer?.parentElement, null);
});
