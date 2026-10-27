import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RelativeTime } from '../../../src/modules/folderpreview/RelativeTime.js';
import { PreviewRows } from '../../../src/modules/folderpreview/PreviewRows.js';
import { PreviewSession } from '../../../src/modules/folderpreview/PreviewSession.js';
import { PreviewText } from '../../../src/modules/folderpreview/PreviewText.js';
import type { LinkEntry } from '../../../src/modules/folders/FolderTree.js';

const NOW = new Date('2026-10-27T12:00:00Z');
const ago = (ms: number): Date => new Date(NOW.getTime() - ms);
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const entry = (id: string, title: string, url: string): LinkEntry => ({ kind: 'link', id, title, url, key: id, depth: 0 });

const LINKS = [
  entry('a', 'Alpha', 'https://alpha.example/'),
  entry('b', 'Bravo', 'https://bravo.example/docs'),
  entry('c', 'Charlie', 'https://charlie.example/'),
  entry('d', 'Delta', 'https://delta.example/'),
];

const dates = (records: Record<string, Date>): { get: (key: string) => Date | null } => ({ get: (key) => records[key] ?? null });

test('formats the time since last opening in the interface language', () => {
  assert.equal(RelativeTime.format(ago(23 * MINUTE), NOW, 'it'), '23 minuti fa');
  assert.equal(RelativeTime.format(ago(5 * HOUR), NOW, 'en'), '5 hours ago');
  assert.equal(RelativeTime.format(ago(3 * DAY), NOW, 'en'), '3 days ago');
  assert.equal(RelativeTime.format(ago(70 * DAY), NOW, 'it'), '2 mesi fa');
  assert.equal(RelativeTime.format(ago(400 * DAY), NOW, 'en'), 'last year');
  assert.equal(RelativeTime.format(ago(10_000), NOW, 'en'), 'now');
  assert.equal(PreviewText.of('it-IT').never, 'mai aperto');
  assert.equal(PreviewText.of('fr').never, 'never opened');
});

test('sorts rows by last opening with unrecorded tabs last', () => {
  const rows = PreviewRows.build(LINKS, dates({ c: ago(HOUR), a: ago(DAY) }));
  assert.deepEqual(
    rows.map((row) => row.link.id),
    ['c', 'a', 'b', 'd'],
  );
  assert.deepEqual(
    rows.map((row) => row.openedAt === null),
    [false, false, true, true],
  );
});

test('filters rows by title or address ignoring case', () => {
  const rows = PreviewRows.build(LINKS, dates({}));
  assert.deepEqual(
    PreviewRows.filter(rows, 'BRAV').map((row) => row.link.id),
    ['b'],
  );
  assert.deepEqual(
    PreviewRows.filter(rows, 'Charlie.EXAMPLE').map((row) => row.link.id),
    ['c'],
  );
  assert.deepEqual(
    PreviewRows.filter(rows, 'docs').map((row) => row.link.id),
    ['b'],
  );
  assert.equal(PreviewRows.filter(rows, '  ').length, 4);
  assert.equal(PreviewRows.filter(rows, 'zzz').length, 0);
});

test('moves the highlight with wrap and resets it when the text changes', () => {
  const session = new PreviewSession(PreviewRows.build(LINKS, dates({})));
  session.move(-1);
  assert.equal(session.highlighted, 3);
  session.move(1);
  assert.equal(session.highlighted, 0);
  session.move(1);
  session.setQuery('a');
  assert.equal(session.highlighted, 0);
  session.setQuery('zzz');
  session.move(1);
  assert.equal(session.activate(), null);
});
