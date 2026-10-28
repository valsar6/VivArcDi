import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FolderTreeSource } from '../../../src/modules/folders/FolderTreeSource.js';
import { BookmarkFolderFinder } from '../../../src/core/bookmarks/BookmarkFolderFinder.js';
import { silentLogger, settle } from '../reopen/fakes.js';
import { FakeBookmarks, ROOT_PATH, bookmarkTree, folder, immediateFrames, link, recordingChrome } from './fakes.js';
import { Logger } from '../../../src/core/Logger.js';
import { LinkKeyIndex } from '../../../src/core/bookmarks/LinkKeyIndex.js';

function source(bookmarks: FakeBookmarks, onChange: () => void = (): void => undefined): FolderTreeSource {
  return new FolderTreeSource(bookmarks, { path: ROOT_PATH, maxDepth: 3, onChange, logger: silentLogger(), timing: immediateFrames });
}

test('rebuilds the tree when the bookmarks change', async () => {
  const bookmarks = new FakeBookmarks(bookmarkTree([folder('10', 'Hobbies', [link('11', 'Chess', 'https://chess.com/')])]));
  let rebuilt = 0;
  const tree = source(bookmarks, () => (rebuilt += 1));
  await tree.start();
  assert.equal(tree.entries.length, 1);
  assert.equal(rebuilt, 1);

  bookmarks.change(bookmarkTree([folder('10', 'Hobbies', []), folder('12', 'Music', [])]));
  bookmarks.change(bookmarkTree([folder('10', 'Hobbies', []), folder('12', 'Music', []), folder('13', 'Design', [])]));
  await settle();
  assert.deepEqual(
    tree.entries.map((entry) => entry.title),
    ['Hobbies', 'Music', 'Design'],
  );
  assert.equal(rebuilt, 2, 'a burst of changes is drawn once');

  tree.stop();
  assert.equal(bookmarks.listeners.size, 0);
});

test('stays empty when no folder matches the root', async () => {
  const bookmarks = new FakeBookmarks(bookmarkTree([folder('10', 'Hobbies')]));
  const tree = new FolderTreeSource(bookmarks, { path: ['Missing'], maxDepth: 3, onChange: (): void => undefined, logger: silentLogger() });
  await tree.start();
  assert.deepEqual(tree.entries, []);
  tree.stop();
});

test('finds the root by exact titles, the first match winning', () => {
  const tree = [
    folder('1', 'Importati da Firefox', [folder('2', 'Bookmarks bar', [folder('3', 'Wrong')]), folder('4', 'Bookmarks Bar', [folder('5', 'Right')])]),
    folder('6', 'Importati da Firefox', [folder('7', 'Bookmarks Bar', [folder('8', 'Later')])]),
  ];
  assert.equal(BookmarkFolderFinder.find(tree, ROOT_PATH)?.id, '4');
  assert.equal(BookmarkFolderFinder.find(tree, ['Bookmarks BAR']), null);
  assert.deepEqual(BookmarkFolderFinder.parsePath(' Importati da Firefox / Bookmarks Bar/ '), ROOT_PATH);
});

test('reads bookmarks without changing them', async () => {
  const { calls, bookmarks } = recordingChrome(bookmarkTree([folder('10', 'Hobbies', [link('11', 'Chess', 'https://chess.com/')])]));
  const tree = new FolderTreeSource(bookmarks, { path: ROOT_PATH, maxDepth: 3, onChange: (): void => undefined, logger: silentLogger(), timing: immediateFrames });
  await tree.start();
  const index = LinkKeyIndex.acquire(bookmarks, ROOT_PATH, silentLogger());
  await settle();
  assert.equal(index.has('chess.com'), true);
  index.release();
  tree.stop();

  const writes = ['create', 'update', 'move', 'remove', 'removeTree'];
  assert.deepEqual(
    calls.filter((call) => writes.includes(call)),
    [],
  );
  assert.ok(calls.includes('getTree'));
  const exposed = Object.getOwnPropertyNames(Object.getPrototypeOf(bookmarks));
  assert.deepEqual(
    exposed.filter((name) => writes.includes(name)),
    [],
  );
});

function recordingLogger(): { logger: Logger; warnings: unknown[][] } {
  const warnings: unknown[][] = [];
  const sink = { info: (): void => undefined, error: (): void => undefined, warn: (...message: unknown[]): void => void warnings.push(message) };
  return { logger: new Logger('test', sink), warnings };
}

test('logs a missing workspace root once', async () => {
  const bookmarks = new FakeBookmarks(bookmarkTree([folder('10', 'Hobbies')]));
  const { logger, warnings } = recordingLogger();
  const tree = new FolderTreeSource(bookmarks, { path: [], maxDepth: 3, onChange: (): void => undefined, logger, timing: immediateFrames });
  await tree.start();
  assert.equal(warnings.length, 0, 'an empty root is not a problem');

  await tree.useRoot(['Missing']);
  await tree.rebuild();
  await tree.useRoot(['Gone']);
  await tree.useRoot(['Missing']);
  assert.deepEqual(tree.entries, []);
  assert.equal(warnings.length, 2);
  tree.stop();
});

test('switches to the folders of another root', async () => {
  const bookmarks = new FakeBookmarks(
    bookmarkTree([folder('10', 'Work', [folder('11', 'Jira')]), folder('20', 'Music', [folder('21', 'Radio'), folder('22', 'Live')])]),
  );
  let rebuilt = 0;
  const tree = new FolderTreeSource(bookmarks, { path: [], maxDepth: 3, onChange: (): number => (rebuilt += 1), logger: silentLogger(), timing: immediateFrames });
  await tree.useRoot([...ROOT_PATH, 'Work']);
  assert.equal(rebuilt, 0, 'nothing is read before start');
  await tree.start();
  assert.deepEqual(tree.entries.map((entry) => entry.title), ['Jira']);
  await tree.useRoot([...ROOT_PATH, 'Music']);
  assert.deepEqual(tree.entries.map((entry) => entry.title), ['Radio', 'Live']);
  await tree.useRoot([]);
  assert.deepEqual(tree.entries, []);
  tree.stop();
});

test('knows the links of every root so that tabs of other roots stay linked', async () => {
  const bookmarks = new FakeBookmarks(
    bookmarkTree([
      folder('10', 'Work', [link('11', 'Jira', 'https://jira.example/')]),
      folder('20', 'Music', [link('21', 'Radio', 'https://radio.example/')]),
    ]),
  );
  const work = [...ROOT_PATH, 'Work'];
  const music = [...ROOT_PATH, 'Music'];
  const tree = new FolderTreeSource(bookmarks, { path: work, otherPaths: [work, music], maxDepth: 3, onChange: (): void => undefined, logger: silentLogger(), timing: immediateFrames });
  await tree.start();
  assert.deepEqual([...(tree.linkIds ?? [])], ['11', '21']);
  bookmarks.change(bookmarkTree([folder('10', 'Work', [link('11', 'Jira', 'https://jira.example/')])]));
  await tree.rebuild();
  assert.equal(tree.linkIds, null, 'a missing root unlinks nothing');
  tree.stop();
});
