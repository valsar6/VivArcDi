import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HiddenButtons } from '../../../src/modules/incognito/HiddenButtons.js';
import { IncognitoHeader } from '../../../src/modules/incognito/IncognitoHeader.js';
import { NewTabRow } from '../../../src/modules/incognito/NewTabRow.js';
import { asDocument } from '../../core/dom.js';
import { immediateFrames } from '../folders/fakes.js';
import { IncognitoDocument } from './fakes.js';

test('the header shows the title and a clear button that calls its handler', () => {
  const dom = new IncognitoDocument();
  const cleared: number[] = [];
  const header = new IncognitoHeader(asDocument(dom), (): void => void cleared.push(1));
  const element = header.element as unknown as ReturnType<IncognitoDocument['createElement']>;
  assert.ok(element.hasAttribute('data-vivarcdi-incognito-header'));
  assert.deepEqual(element.children.map((part) => part.textContent), ['Incognito Tabs', 'Clear']);
  assert.equal(element.properties.get('-webkit-app-region'), 'no-drag');
  element.children[1]?.click();
  assert.deepEqual(cleared, [1]);
});

test('the new tab row shows a plus icon and the text and calls its handler', () => {
  const dom = new IncognitoDocument();
  const opened: number[] = [];
  const row = new NewTabRow(asDocument(dom), (): void => void opened.push(1));
  const element = row.element as unknown as ReturnType<IncognitoDocument['createElement']>;
  assert.ok(element.hasAttribute('data-vivarcdi-new-tab-row'));
  assert.deepEqual(element.children.map((part) => part.textContent), ['', 'New Tab']);
  assert.equal(element.properties.get('-webkit-app-region'), 'no-drag');
  element.click();
  assert.deepEqual(opened, [1]);
});

test('hides the buttons that the catalog finds, again after a redraw, and shows them on stop', async () => {
  const dom = new IncognitoDocument();
  let redraw = (): void => undefined;
  const watch = (_target: Node, onChange: () => void): (() => void) => {
    redraw = onChange;
    return () => undefined;
  };
  const first = dom.vivaldiButton('.newtab');
  const hidden = new HiddenButtons(asDocument(dom), ['.newtab', '.workspace', '.missing'], dom.browser as unknown as Node, { watch, timing: immediateFrames });
  hidden.start();
  assert.ok(first.hasAttribute('data-vivarcdi-private-hidden'));
  const second = dom.vivaldiButton('.workspace');
  redraw();
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(second.hasAttribute('data-vivarcdi-private-hidden'));
  hidden.stop();
  assert.equal(first.hasAttribute('data-vivarcdi-private-hidden') || second.hasAttribute('data-vivarcdi-private-hidden'), false);
});
