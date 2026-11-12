import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UrlCopier } from '../../../src/modules/copyurl/UrlCopier.js';
import { FakeTabs } from '../favorites/fakes.js';
import type { FakeTab } from '../favorites/fakes.js';
import { asDocument, CopyDocument, FakeClipboard } from './fakes.js';

const inCurrentWindow = (id: number, active: boolean, url: string): FakeTab => {
  const tab = { id, active, currentWindow: true, url };
  return tab;
};

const activeTabs = (): FakeTabs =>
  new FakeTabs([inCurrentWindow(1, false, 'https://other.example/'), inCurrentWindow(2, true, 'https://active.example/page?q=1')]);

test('copy writes the address of the active tab to the clipboard', async () => {
  const tabs = activeTabs();
  const clipboard = new FakeClipboard();
  const document = new CopyDocument({}, clipboard);
  const url = await UrlCopier.for(tabs, asDocument(document), clipboard).copyActive();
  assert.equal(url, 'https://active.example/page?q=1');
  assert.deepEqual(clipboard.written, ['https://active.example/page?q=1']);
  assert.deepEqual(tabs.calls, [['query', { active: true, currentWindow: true }]]);
  assert.deepEqual(document.copiedFromField, []);
});

test('copy falls back to a hidden field when the clipboard refuses', async () => {
  const clipboard = new FakeClipboard();
  clipboard.refuse = true;
  const document = new CopyDocument({}, clipboard);
  await UrlCopier.for(activeTabs(), asDocument(document), clipboard).copyActive();
  assert.deepEqual(document.copiedFromField, ['https://active.example/page?q=1']);
  assert.deepEqual(document.body.children, []);
  assert.equal(document.activeElement.focused, 1);
});

test('copy falls back to a hidden field when the clipboard is missing', async () => {
  const document = new CopyDocument({}, undefined);
  await UrlCopier.for(activeTabs(), asDocument(document), undefined).copyActive();
  assert.deepEqual(document.copiedFromField, ['https://active.example/page?q=1']);
});

test('copy fails when every way to copy is refused', async () => {
  const clipboard = new FakeClipboard();
  clipboard.refuse = true;
  const document = new CopyDocument({}, clipboard);
  document.commandWorks = false;
  await assert.rejects(UrlCopier.for(activeTabs(), asDocument(document), clipboard).copyActive(), AggregateError);
  assert.deepEqual(document.body.children, []);
});

test('copy fails when the active tab has no address', async () => {
  const clipboard = new FakeClipboard();
  const tabs = new FakeTabs([inCurrentWindow(3, true, '')]);
  await assert.rejects(UrlCopier.for(tabs, asDocument(new CopyDocument({}, clipboard)), clipboard).copyActive(), /no address/);
  assert.deepEqual(clipboard.written, []);
});
