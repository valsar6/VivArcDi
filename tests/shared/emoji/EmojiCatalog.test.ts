import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { EmojiCatalog } from '../../../src/shared/emoji/EmojiCatalog.js';
import { Logger } from '../../../src/core/support/Logger.js';
import { SilentSink } from '../../loader/fakes.js';

const ORDER = ['faces', 'nature', 'food', 'activities', 'travel', 'objects', 'symbols', 'flags'];

const FIXTURE = {
  unicode: '15.1',
  categories: [
    {
      id: 'faces',
      label: 'Faces',
      emoji: [
        { e: '😀', n: 'grinning face', k: ['smile', 'happy'] },
        { e: '😢', n: 'crying face', k: ['sad', 'tear'] },
      ],
    },
    { id: 'nature', label: 'Nature', emoji: [{ e: '🐶', n: 'dog face', k: ['pet', 'puppy'] }] },
    { e: 'ignored' },
  ],
};

const loggerOf = (): { logger: Logger; sink: SilentSink } => {
  const sink = new SilentSink();
  return { logger: new Logger('emoji', sink), sink };
};

const catalogOf = (data: unknown): Promise<EmojiCatalog> =>
  EmojiCatalog.load({ json: async <T>() => data as T }, loggerOf().logger);

const realFile = async (): Promise<unknown> =>
  JSON.parse(await readFile(new URL('../../../src/shared/emoji/emoji.json', import.meta.url), 'utf8')) as unknown;

test('the shipped file has the eight categories in order', async () => {
  const catalog = await catalogOf(await realFile());
  assert.deepEqual(
    catalog.categories().map((category) => category.id),
    ORDER,
  );
  assert.ok(catalog.categories().every((category) => category.emoji.length > 0));
});

test('every shipped entry has a character, a name and a keyword', async () => {
  const entries = (await catalogOf(await realFile())).categories().flatMap((category) => category.emoji);
  assert.ok(entries.length > 1000);
  for (const entry of entries) {
    assert.ok(entry.emoji.length > 0 && entry.name.length > 0 && entry.keywords.length > 0, entry.name);
  }
});

test('the shipped file has no duplicate character', async () => {
  const entries = (await catalogOf(await realFile())).categories().flatMap((category) => category.emoji);
  assert.equal(new Set(entries.map((entry) => entry.emoji)).size, entries.length);
});

test('keeps the category of each entry and skips malformed categories', async () => {
  const catalog = await catalogOf(FIXTURE);
  assert.deepEqual(
    catalog.categories().map((category) => category.id),
    ['faces', 'nature'],
  );
  assert.equal(catalog.categories()[1]?.emoji[0]?.category, 'nature');
});

test('searches by name and by keyword', async () => {
  const catalog = await catalogOf(FIXTURE);
  assert.deepEqual(
    catalog.search('crying').map((entry) => entry.emoji),
    ['😢'],
  );
  assert.deepEqual(
    catalog.search('puppy').map((entry) => entry.emoji),
    ['🐶'],
  );
  assert.deepEqual(
    catalog.search('face').map((entry) => entry.emoji),
    ['😀', '😢', '🐶'],
  );
});

test('search needs every word and ignores case', async () => {
  const catalog = await catalogOf(FIXTURE);
  assert.deepEqual(
    catalog.search('GRINNING happy').map((entry) => entry.emoji),
    ['😀'],
  );
  assert.deepEqual(catalog.search('grinning sad'), []);
});

test('search gives none for an empty text', async () => {
  const catalog = await catalogOf(FIXTURE);
  assert.deepEqual(catalog.search(''), []);
  assert.deepEqual(catalog.search('   '), []);
});

test('a missing file gives an empty catalog and one warning', async () => {
  const { logger, sink } = loggerOf();
  const catalog = await EmojiCatalog.load(
    {
      json: async () => {
        throw new Error('404');
      },
    },
    logger,
  );
  assert.deepEqual(catalog.categories(), []);
  assert.deepEqual(catalog.search('face'), []);
  assert.equal(sink.lines.filter((line) => line[0] === 'warn').length, 1);
});

test('a file with the wrong shape gives an empty catalog and one warning', async () => {
  const { logger, sink } = loggerOf();
  const catalog = await EmojiCatalog.load({ json: async <T>() => 'nope' as T }, logger);
  assert.deepEqual(catalog.categories(), []);
  assert.equal(sink.lines.filter((line) => line[0] === 'warn').length, 1);
});
