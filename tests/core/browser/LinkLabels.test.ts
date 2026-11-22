import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DATA_MEMBER, VERSION_MEMBER } from '../../../src/core/browser/StoredFormat.js';
import type { StoredFormat, StoredRead, VersionedStorage } from '../../../src/core/browser/StoredFormat.js';
import type { SaveOutcome } from '../../../src/core/browser/SavingStorage.js';
import { LabelKeys, LABELS_STORAGE_KEY, LinkLabels } from '../../../src/core/browser/LinkLabels.js';
import { Logger } from '../../../src/core/support/Logger.js';
import { SilentSink } from '../../loader/fakes.js';
import { MemoryStorage, silentLogger } from '../../modules/reopen/fakes.js';

const KEY = LabelKeys.bookmark('11');
const OTHER = LabelKeys.bookmark('12');
const FAVICON = 'https://site.example/icon.png';

class FailingStorage implements VersionedStorage {
  public readonly mode = 'persistent';

  public getItem(): string | null {
    return null;
  }

  public setItem(): void {
    return undefined;
  }

  public read<T>(_key: string, format: StoredFormat<T>): StoredRead<T> {
    return format.decode(null);
  }

  public async save(): Promise<SaveOutcome> {
    return 'failed';
  }
}

const saved = (storage: MemoryStorage): unknown => JSON.parse(storage.items.get(LABELS_STORAGE_KEY) ?? 'null');

test('resets name and icon', async () => {
  const storage = new MemoryStorage();
  const labels = LinkLabels.of(storage, silentLogger());
  await labels.set(KEY, { name: 'Mail', icon: { emoji: '📧' }, favicon: FAVICON });
  await labels.set(OTHER, { name: 'Other' });
  assert.equal(await labels.clear(KEY), 'saved');
  assert.equal(labels.get(KEY), undefined);
  assert.deepEqual(saved(storage), { [OTHER]: { name: 'Other' } });
});

test('sets and reads a name, an icon and a favicon', async () => {
  const storage = new MemoryStorage();
  const labels = LinkLabels.of(storage, silentLogger());
  assert.equal(await labels.set(KEY, { name: 'Mail', icon: { symbol: 'star' }, favicon: FAVICON }), 'saved');
  assert.deepEqual(labels.get(KEY), { name: 'Mail', icon: { symbol: 'star' }, favicon: FAVICON });
  assert.deepEqual([...labels.all().keys()], [KEY]);
  assert.deepEqual(saved(storage), { [KEY]: { name: 'Mail', icon: { symbol: 'star' }, favicon: FAVICON } });
});

test('removing the name keeps the icon', async () => {
  const labels = LinkLabels.of(new MemoryStorage(), silentLogger());
  await labels.set(KEY, { name: 'Mail', icon: { emoji: '📧' } });
  await labels.set(KEY, { name: null });
  assert.deepEqual(labels.get(KEY), { icon: { emoji: '📧' } });
});

test('an entry left with nothing is dropped', async () => {
  const storage = new MemoryStorage();
  const labels = LinkLabels.of(storage, silentLogger());
  await labels.set(KEY, { name: 'Mail' });
  await labels.set(KEY, { name: null });
  assert.equal(labels.get(KEY), undefined);
  assert.deepEqual(saved(storage), {});
});

test('keys a saved row by bookmark and a tab by the address of its own page', () => {
  assert.equal(LabelKeys.bookmark('11'), 'bookmark:11');
  const own = JSON.stringify({ vivarcdi: { pinnedUrl: 'https://www.mail.example/inbox' } });
  assert.equal(LabelKeys.page({ url: 'https://elsewhere.example/', vivExtData: own } as unknown as chrome.tabs.Tab), 'page:mail.example/inbox');
  assert.equal(LabelKeys.page({ url: 'https://www.news.example/' } as chrome.tabs.Tab), 'page:news.example');
  assert.equal(LabelKeys.page({ pendingUrl: 'https://load.example/' } as chrome.tabs.Tab), 'page:load.example');
  assert.equal(LabelKeys.page({ url: 'vivaldi://settings' } as chrome.tabs.Tab), null);
  assert.equal(LabelKeys.page({} as chrome.tabs.Tab), null);
});

test('two modules on one storage see each other changes', async () => {
  const storage = new MemoryStorage();
  const first = LinkLabels.of(storage, silentLogger());
  const second = LinkLabels.of(storage, silentLogger());
  assert.equal(first, second);
  assert.notEqual(LinkLabels.of(new MemoryStorage(), silentLogger()), first);
  const seen: string[] = [];
  const stop = second.onChange(({ key }) => seen.push(key));
  await first.set(KEY, { name: 'Mail' });
  assert.equal(second.get(KEY)?.name, 'Mail');
  stop();
  await first.set(OTHER, { name: 'Other' });
  assert.deepEqual(seen, [KEY]);
});

test('flags a change that comes from the sync', async () => {
  const labels = LinkLabels.of(new MemoryStorage(), silentLogger());
  const seen: boolean[] = [];
  labels.onChange(({ fromSync }) => seen.push(fromSync));
  await labels.set(KEY, { name: 'A' }, { fromSync: true });
  await labels.set(KEY, { name: 'B' });
  assert.deepEqual(seen, [true, false]);
});

test('returns a failed save, keeps the label in memory and warns once', async () => {
  const sink = new SilentSink();
  const labels = LinkLabels.of(new FailingStorage(), new Logger('test', sink));
  const outcome: SaveOutcome = await labels.set(KEY, { name: 'Mail' });
  await labels.set(OTHER, { name: 'Other' });
  assert.equal(outcome, 'failed');
  assert.equal(labels.get(KEY)?.name, 'Mail');
  assert.equal(sink.lines.filter(([level]) => level === 'warn').length, 1);
});

test('reads a saved value and skips the damaged entries', () => {
  const storage = new MemoryStorage();
  storage.items.set(
    LABELS_STORAGE_KEY,
    JSON.stringify({
      good: { name: 'Mail', icon: { symbol: 'heart' }, favicon: FAVICON },
      badName: { name: 5 },
      badIcon: { icon: { emoji: '' } },
      noIcon: { icon: {} },
      badFavicon: { favicon: 'javascript:alert(1)' },
      notAnObject: 'x',
    }),
  );
  const labels = LinkLabels.of(storage, silentLogger());
  assert.deepEqual([...labels.all().keys()], ['good']);
  assert.deepEqual(labels.get('good'), { name: 'Mail', icon: { symbol: 'heart' }, favicon: FAVICON });
});

test('reads nothing from a value that is not an object', () => {
  const storage = new MemoryStorage();
  storage.items.set(LABELS_STORAGE_KEY, '[1,2]');
  assert.equal(LinkLabels.of(storage, silentLogger()).all().size, 0);
});

test('reads a value saved by a newer version', () => {
  const storage = new MemoryStorage();
  storage.items.set(LABELS_STORAGE_KEY, JSON.stringify({ [VERSION_MEMBER]: 2, [DATA_MEMBER]: { [KEY]: { name: 'Future' } } }));
  assert.equal(LinkLabels.of(storage, silentLogger()).get(KEY)?.name, 'Future');
});

test('refuses a favicon that is not a web or image address or is too long', async () => {
  const labels = LinkLabels.of(new MemoryStorage(), silentLogger());
  await labels.set(KEY, { favicon: 'javascript:alert(1)' });
  await labels.set(OTHER, { favicon: `data:image/png;base64,${'A'.repeat(9000)}` });
  assert.equal(labels.all().size, 0);
  await labels.set(KEY, { favicon: 'data:image/png;base64,AAAA' });
  assert.equal(labels.get(KEY)?.favicon, 'data:image/png;base64,AAAA');
});

test('copies the whole entry to another key', async () => {
  const labels = LinkLabels.of(new MemoryStorage(), silentLogger());
  await labels.set(KEY, { name: 'Mail', icon: { emoji: '📧' }, favicon: FAVICON });
  await labels.copy(KEY, OTHER);
  await labels.copy('bookmark:none', 'bookmark:also-none');
  assert.deepEqual(labels.get(OTHER), labels.get(KEY));
  assert.equal(labels.all().size, 2);
  await labels.set(OTHER, { name: 'Changed' });
  assert.equal(labels.get(KEY)?.name, 'Mail');
});
