import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TabDataWriter } from '../../../src/core/tabs/TabDataWriter.js';
import { TabData } from '../../../src/core/tabs/TabData.js';
import { FolderTabs } from '../../modules/folders/fakes.js';
import { SilentSink } from '../../loader/fakes.js';
import { Logger } from '../../../src/core/support/Logger.js';

class SlowTabs extends FolderTabs {
  public override async get(tabId: number): Promise<chrome.tabs.Tab> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    return super.get(tabId);
  }

  public override async update(tabId: number, properties: Record<string, unknown>): Promise<chrome.tabs.Tab> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    return super.update(tabId, properties);
  }
}

test('gives the same writer to the same tabs API', () => {
  const tabs = new FolderTabs();
  assert.equal(TabDataWriter.of(tabs), TabDataWriter.of(tabs));
  assert.notEqual(TabDataWriter.of(tabs), TabDataWriter.of(new FolderTabs()));
});

test('reads the tab again for every write of the same tab', async () => {
  const tabs = new SlowTabs([{ id: 1 }]);
  const writer = new TabDataWriter(tabs);
  await Promise.all([
    writer.write(1, (tab) => TabData.withOwn(tab, { bookmarkId: '11' })),
    writer.write(1, (tab) => TabData.withOwn(tab, { lastActive: 5 })),
  ]);
  assert.deepEqual(tabs.tabs.get(1)?.vivExtData, JSON.stringify({ vivarcdi: { bookmarkId: '11', lastActive: 5 } }));
});

test('does not start a write of a tab before the previous one is done', async () => {
  const tabs = new SlowTabs([{ id: 1 }]);
  const writer = new TabDataWriter(tabs);
  const order: string[] = [];
  await Promise.all([
    writer.write(1, () => (order.push('first'), '{"a":1}')),
    writer.write(1, (tab) => (order.push(`second sees ${TabData.dataOf(tab)}`), '{"a":2}')),
  ]);
  assert.deepEqual(order, ['first', 'second sees {"a":1}']);
});

test('lets writes of different tabs run side by side', async () => {
  const tabs = new SlowTabs([{ id: 1 }, { id: 2 }]);
  const writer = new TabDataWriter(tabs);
  await Promise.all([writer.write(1, () => '{}'), writer.write(2, () => '{}')]);
  assert.deepEqual(tabs.calls.map(([name]) => name), ['update', 'update']);
});

test('keeps writing after a write failed', async () => {
  const tabs = new SlowTabs([{ id: 1 }]);
  const writer = new TabDataWriter(tabs);
  const failed = writer.write(1, () => {
    throw new Error('change failed');
  });
  const next = writer.write(1, () => '{"ok":true}');
  await assert.rejects(failed, /change failed/);
  await next;
  assert.equal(tabs.tabs.get(1)?.vivExtData, '{"ok":true}');
});

test('keeps writing after an update failed', async () => {
  const tabs = new SlowTabs([{ id: 1 }]);
  const writer = new TabDataWriter(tabs);
  tabs.failing.add('update');
  const failed = writer.write(1, () => '{"a":1}');
  await assert.rejects(failed, /update failed/);
  tabs.failing.delete('update');
  await writer.write(1, () => '{"a":2}');
  assert.equal(tabs.tabs.get(1)?.vivExtData, '{"a":2}');
});

test('writes the tab of its own window', async () => {
  const tabs = new FolderTabs([{ id: 1 }, { id: 2, windowId: 2 }]);
  await new TabDataWriter(tabs).write(1, () => '{"a":1}');
  assert.equal(tabs.tabs.get(1)?.vivExtData, '{"a":1}');
});

test('skips a tab of another window', async () => {
  const tabs = new FolderTabs([{ id: 1 }, { id: 2, windowId: 2 }]);
  await new TabDataWriter(tabs).write(2, () => '{"a":1}');
  assert.deepEqual(tabs.calls, []);
});

test('judges the window from the tab as just read', async () => {
  const tabs = new SlowTabs([{ id: 1 }]);
  const writer = new TabDataWriter(tabs);
  const queued = writer.write(1, () => '{"a":1}');
  tabs.tabs.set(1, { id: 1, windowId: 2 });
  await queued;
  assert.deepEqual(tabs.calls, []);
});

test('writes as before when the window is unknown', async () => {
  const tabs = new FolderTabs([{ id: 1, windowId: 2 }]);
  tabs.ownWindowId = async (): Promise<number | null> => null;
  const sink = new SilentSink();
  const writer = new TabDataWriter(tabs, new Logger('test', sink));
  await writer.write(1, () => '{"a":1}');
  await writer.write(1, () => '{"a":2}');
  assert.equal(tabs.tabs.get(1)?.vivExtData, '{"a":2}');
  assert.equal(sink.lines.filter(([level]) => level === 'warn').length, 1);
});

test('two windows never both write the same tab', async () => {
  const first = new SlowTabs([{ id: 1, vivExtData: '{"kept":true}' }]);
  const second = new SlowTabs();
  second.tabs = first.tabs;
  second.windowId = 2;
  await Promise.all([
    new TabDataWriter(first).write(1, () => '{"window":1}'),
    new TabDataWriter(second).write(1, () => '{"window":2}'),
  ]);
  assert.equal(first.tabs.get(1)?.vivExtData, '{"window":1}');
  assert.deepEqual(second.calls, []);
});

test('writes nothing when the change returns null', async () => {
  const tabs = new SlowTabs([{ id: 1 }]);
  await new TabDataWriter(tabs).write(1, () => null);
  assert.deepEqual(tabs.calls, []);
});
