import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BrowserTabs } from '../../../src/core/BrowserTabs.js';
import { AddressField } from '../../../src/modules/incognito/AddressField.js';
import { CommandLauncher } from '../../../src/modules/incognito/CommandLauncher.js';
import { DownloadsButton } from '../../../src/modules/incognito/DownloadsButton.js';
import { asDocument } from '../../core/dom.js';
import { FolderTabs } from '../folders/fakes.js';
import { FieldNode, IncognitoDocument, ManualFrames, runtimeOf } from './fakes.js';

function setup(maxFrames?: number): { dom: IncognitoDocument; frames: ManualFrames; tabs: FolderTabs; address: AddressField; launcher: CommandLauncher } {
  const dom = new IncognitoDocument();
  const frames = new ManualFrames();
  const tabs = new FolderTabs();
  const document = asDocument(dom);
  const address = new AddressField(document, 'input.address', frames.timing, maxFrames);
  const launcher = new CommandLauncher(tabs as unknown as BrowserTabs, runtimeOf(9), address, new DownloadsButton(document));
  return { dom, frames, tabs, address, launcher };
}

test('focuses the address field and selects its text', () => {
  const { dom, address } = setup();
  dom.field = new FieldNode('input', dom);
  address.focus();
  assert.equal(dom.field.focused, true);
  assert.equal(dom.field.selected, true);
});

test('waits for an address field that appears on a later frame', () => {
  const { dom, frames, address } = setup();
  address.focus();
  assert.equal(frames.waiting.length, 1);
  dom.field = new FieldNode('input', dom);
  frames.next();
  assert.equal(dom.field.focused, true);
  assert.equal(frames.waiting.length, 0);
});

test('gives up silently when the address field never appears', () => {
  const { frames, address } = setup(3);
  address.focus();
  while (frames.waiting.length > 0) {
    frames.next();
  }
  assert.equal(frames.scheduled, 3);
});

test('stops waiting for the address field', () => {
  const { frames, address } = setup();
  address.focus();
  address.stop();
  assert.equal(frames.waiting.length, 0);
});

test('opens a blank tab in the current window and then focuses the address field', async () => {
  const { dom, tabs, launcher } = setup();
  dom.field = new FieldNode('input', dom);
  await launcher.newTab();
  assert.deepEqual(tabs.calls, [['create', { windowId: 9 }]]);
  assert.equal(dom.field.focused, true);
});

test('clicks the downloads button whatever the language of its title', () => {
  const { dom, launcher } = setup();
  const other = dom.button('Cronologia (⌘Y)');
  const italian = dom.button('Trasferimenti (⌥⌘L)');
  assert.equal(launcher.openLibrary(), true);
  assert.deepEqual([other.clicks, italian.clicks], [0, 1]);
  const english = dom.button('downloads');
  assert.equal(launcher.openLibrary(), true);
  assert.deepEqual([italian.clicks, english.clicks], [2, 0]);
});

test('reports a missing downloads button', () => {
  const { launcher } = setup();
  assert.equal(launcher.openLibrary(), false);
});
