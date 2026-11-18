import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GuardedStorage } from '../../../src/core/boot/GuardedStorage.js';
import { StoredFormat } from '../../../src/core/browser/StoredFormat.js';
import type { Upgrade } from '../../../src/core/browser/StoredFormat.js';
import { Notices } from '../../../src/core/dom/Notices.js';
import { Logger } from '../../../src/core/support/Logger.js';
import { RecordingToast, SilentSink } from '../../loader/fakes.js';
import { OutcomeStorage } from '../../modules/today/fakes.js';

class CountingStorage extends OutcomeStorage {
  public writes: string[] = [];

  public override setItem(key: string, value: string): void {
    this.writes.push(key);
    super.setItem(key, value);
  }
}

const rule = (data: unknown): { value: string[]; skipped: boolean } | null => {
  if (!Array.isArray(data)) {
    return null;
  }
  const texts = data.filter((item): item is string => typeof item === 'string');
  return { value: texts, skipped: texts.length !== data.length };
};

const format = (upgrades: Upgrade[] = []): StoredFormat<string[]> => new StoredFormat({ empty: [], read: rule, upgrades });

const setup = (): { inner: CountingStorage; toast: RecordingToast; sink: SilentSink; guard: GuardedStorage } => {
  const inner = new CountingStorage();
  const toast = new RecordingToast();
  const sink = new SilentSink();
  return { inner, toast, sink, guard: new GuardedStorage(inner, new Notices(toast), new Logger('test', sink)) };
};

const envelope = (version: number, data: unknown): string => JSON.stringify({ 'vivarcdi:version': version, 'vivarcdi:data': data });

test('upgrades an older value in order without writing', () => {
  const { inner, guard } = setup();
  const order: number[] = [];
  const upgraded = format([
    (data): unknown => {
      order.push(1);
      return [...(data as string[]), 'one'];
    },
    (data): unknown => {
      order.push(2);
      return [...(data as string[]), 'two'];
    },
  ]);
  inner.items.set('vivarcdi.a', '["x"]');
  inner.items.set('vivarcdi.b', envelope(2, ['y']));
  assert.deepEqual(guard.read('vivarcdi.a', upgraded).value, ['x', 'one', 'two']);
  assert.deepEqual(order, [1, 2]);
  assert.deepEqual(guard.read('vivarcdi.b', upgraded).value, ['y', 'two']);
  assert.deepEqual(inner.writes, []);
});

test('keeps a newer value read-only for the session', async () => {
  const { inner, guard } = setup();
  const saved = envelope(3, ['a', 5, 'b']);
  inner.items.set('vivarcdi.k', saved);
  const current = format([(data): unknown => data]);
  const first = guard.read('vivarcdi.k', current);
  assert.equal(first.status, 'newer');
  assert.deepEqual(first.value, ['a', 'b']);
  guard.setItem('vivarcdi.k', '["c"]');
  assert.equal(await guard.save('vivarcdi.k', '["d"]'), 'memory');
  assert.equal(inner.items.get('vivarcdi.k'), saved);
  assert.equal(guard.getItem('vivarcdi.k'), '["d"]');
  const again = guard.read('vivarcdi.k', current);
  assert.equal(again.status, 'newer');
  assert.deepEqual(again.value, ['d']);
});

test('warns once about data from a newer version', () => {
  const { inner, toast, guard } = setup();
  inner.items.set('vivarcdi.a', envelope(2, ['a']));
  inner.items.set('vivarcdi.b', envelope(2, ['b']));
  for (let index = 0; index < 2; index += 1) {
    guard.read('vivarcdi.a', format());
    guard.read('vivarcdi.b', format());
  }
  assert.deepEqual(toast.shown, [
    { text: 'VivArcDi found data from a newer version: some changes will not be saved until you update VivArcDi', kind: 'error' },
  ]);
});

test('keeps a copy of an unreadable value before overwriting it', async () => {
  const { inner, toast, guard } = setup();
  inner.items.set('vivarcdi.a', '{not json');
  inner.items.set('vivarcdi.b', '["x",1]');
  assert.equal(guard.read('vivarcdi.a', format()).status, 'unreadable');
  assert.equal(guard.getItem('vivarcdi.recovery.a'), null);
  await guard.save('vivarcdi.a', '["new"]');
  assert.equal(inner.items.get('vivarcdi.recovery.a'), '{not json');
  assert.equal(inner.items.get('vivarcdi.a'), '["new"]');
  assert.equal(guard.read('vivarcdi.b', format()).skipped, true);
  guard.setItem('vivarcdi.b', '["x"]');
  assert.equal(inner.items.get('vivarcdi.recovery.b'), '["x",1]');
  assert.equal(toast.shown.length, 1);
});

test('does not replace an existing recovery copy', async () => {
  const { inner, guard } = setup();
  inner.items.set('vivarcdi.a', '{not json');
  inner.items.set('vivarcdi.recovery.a', 'old copy');
  guard.read('vivarcdi.a', format());
  await guard.save('vivarcdi.a', '[]');
  assert.equal(inner.items.get('vivarcdi.recovery.a'), 'old copy');
});

test('warns once about unreadable data', () => {
  const { inner, toast, sink, guard } = setup();
  inner.items.set('vivarcdi.a', '{not json');
  inner.items.set('vivarcdi.openFolders.12', '{"x":1}');
  for (let index = 0; index < 2; index += 1) {
    guard.read('vivarcdi.a', format());
    guard.read('vivarcdi.openFolders.12', format());
  }
  assert.deepEqual(toast.shown, [{ text: 'VivArcDi could not read some saved data and kept a copy of it', kind: 'error' }]);
  const warnings = sink.lines.filter((line) => line[0] === 'warn').map((line) => line.join(' '));
  assert.equal(warnings.length, 2);
  assert.match(warnings[0] ?? '', /vivarcdi\.a.*vivarcdi\.recovery\.a/);
  assert.match(warnings[1] ?? '', /vivarcdi\.openFolders\.12.*vivarcdi\.recovery\.openFolders\.12/);
});

test('shows no notice and keeps no copy for readable data', async () => {
  const { inner, toast, sink, guard } = setup();
  assert.equal(guard.read('vivarcdi.a', format()).status, 'empty');
  inner.items.set('vivarcdi.b', '["x"]');
  assert.equal(guard.read('vivarcdi.b', format()).status, 'current');
  await guard.save('vivarcdi.a', '["y"]');
  await guard.save('vivarcdi.b', '["z"]');
  assert.deepEqual(toast.shown, []);
  assert.deepEqual(sink.lines, []);
  assert.deepEqual([...inner.items.keys()].filter((key) => key.startsWith('vivarcdi.recovery.')), []);
});
