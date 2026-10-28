import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TabData } from '../../../src/core/TabData.js';
import { ArchiveButton } from '../../../src/modules/today/ArchiveButton.js';
import { ARCHIVE_CONSOLE_PREFIX, parseArchiveMessage } from '../../../src/modules/today/ArchiveMessage.js';
import { ArchiveRestorer } from '../../../src/modules/today/ArchiveRestorer.js';
import { ClearButton } from '../../../src/modules/today/ClearButton.js';
import { asDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';
import { immediateFrames } from '../folders/fakes.js';
import { event } from '../pinned/fakes.js';
import { silentLogger } from '../reopen/fakes.js';
import { NOW, TodayDocument, entry } from './fakes.js';

const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

function watched(): { watch: (target: Node, onChange: () => void) => () => void; change: () => void; count: () => number } {
  const listeners = new Set<() => void>();
  return {
    watch: (_target, onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    change: () => listeners.forEach((listener) => listener()),
    count: () => listeners.size,
  };
}

const tabWith = (data: Record<string, unknown>): chrome.tabs.Tab => ({ vivExtData: JSON.stringify(data) }) as unknown as chrome.tabs.Tab;

test('reads the stack of a tab and keeps the stamp next to other own values', () => {
  assert.equal(TabData.stackOf(tabWith({ group: 'abc' })), 'abc');
  assert.equal(TabData.stackOf(tabWith({ group: 4 })), '4');
  assert.equal(TabData.stackOf(tabWith({ group: '' })), null);
  assert.equal(TabData.stackOf(tabWith({ workspaceId: 7 })), null);
  const tab = tabWith({ workspaceId: 7, vivarcdi: { pinnedUrl: 'https://a.example/' } });
  const written = tabWith(JSON.parse(TabData.withOwn(tab, { lastActive: NOW })) as Record<string, unknown>);
  assert.deepEqual(TabData.ownOf(written), { pinnedUrl: 'https://a.example/', lastActive: NOW });
  assert.equal(TabData.of(written), '7');
  assert.deepEqual(TabData.ownOf(tabWith({ vivarcdi: { lastActive: 'soon' } })), {});
});

test('reads archive messages from the runtime and the console', () => {
  const message = { type: 'vivarcdi-archive', token: 't', action: 'open' };
  assert.deepEqual(parseArchiveMessage(message), message);
  assert.deepEqual(parseArchiveMessage(`${ARCHIVE_CONSOLE_PREFIX}${JSON.stringify(message)}`), message);
  assert.equal(parseArchiveMessage({ ...message, action: 'close' }), null);
  assert.equal(parseArchiveMessage(`${ARCHIVE_CONSOLE_PREFIX}{`), null);
  assert.equal(parseArchiveMessage('vivarcdi-pinned:{}'), null);
});

test('restores an entry in its workspace and removes it from the archive', async () => {
  const opened: Array<[string, string | null]> = [];
  const removed: unknown[] = [];
  const archived = entry('https://a.example/', 'A', NOW, '7');
  const restorer = new ArchiveRestorer(
    { open: async (url, workspace): Promise<chrome.tabs.Tab> => (opened.push([url, workspace]), { id: 5 } as chrome.tabs.Tab) },
    { remove: (chosen): number => removed.push(chosen) },
    silentLogger(),
  );
  await restorer.restore(archived);
  assert.deepEqual(opened, [['https://a.example/', '7']]);
  assert.deepEqual(removed, [archived]);
  const failing = new ArchiveRestorer({ open: async (): Promise<chrome.tabs.Tab> => Promise.reject(new Error('no')) }, { remove: (chosen): number => removed.push(chosen) }, silentLogger());
  await failing.restore(archived);
  assert.equal(removed.length, 1);
});

test('puts the Clear button back in the separator row and takes its clicks', async () => {
  const dom = new TodayDocument();
  const rows = new Map<string, DomNode | null>([['[data-vivarcdi-pinned-last]', dom.list]]);
  dom.querySelector = ((selector: string): DomNode | null => rows.get(selector) ?? null) as typeof dom.querySelector;
  const watcher = watched();
  const cleared: number[] = [];
  const button = new ClearButton(asDocument(dom), dom.parent as unknown as Node, () => cleared.push(1), { watch: watcher.watch, timing: immediateFrames });
  button.start();
  const clear = dom.list.children.at(-1);
  assert.ok(clear);
  assert.ok(clear.hasAttribute('data-vivarcdi-clear'));
  const other = dom.createElement('div');
  dom.parent.append(other);
  rows.set('[data-vivarcdi-pinned-last]', other);
  watcher.change();
  await settle();
  assert.equal(other.children.at(-1), clear);
  const press = dom.listeners.get('mousedown')?.[0];
  const down = event('mousedown', { target: clear });
  press?.(down as unknown as Event);
  assert.equal(down.stopped, true);
  const click = event('click', { target: clear });
  dom.listeners.get('click')?.forEach((listener) => listener(click as unknown as Event));
  assert.deepEqual(cleared, [1]);
  dom.listeners.get('click')?.forEach((listener) => listener(event('click', { target: other }) as unknown as Event));
  assert.deepEqual(cleared, [1]);
  button.stop();
  assert.equal(clear.parentElement, null);
  assert.equal(watcher.count(), 0);
  assert.equal([...dom.listeners.values()].flat().length, 0);
});

test('keeps the archive footer at the end of the tab container', () => {
  const dom = new TodayDocument();
  const watcher = watched();
  const opened: number[] = [];
  const footer = new ArchiveButton(asDocument(dom), '#tabs-container', () => opened.push(1), { root: dom.parent as unknown as Node, watch: watcher.watch, timing: immediateFrames });
  footer.start();
  const element = dom.list.children.at(-1);
  assert.ok(element);
  assert.ok(element.hasAttribute('data-vivarcdi-archive-footer'));
  element.children[0]?.click();
  assert.deepEqual(opened, [1]);
  footer.stop();
  assert.equal(element.parentElement, null);
});
