import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FolderRows } from '../../../src/modules/folders/FolderRows.js';
import type { Row } from '../../../src/modules/folders/FolderRows.js';
import { FolderTree } from '../../../src/modules/folders/FolderTree.js';
import { OpenFolders } from '../../../src/modules/folders/OpenFolders.js';
import type { LinkRef, OpenTab } from '../../../src/modules/folders/OpenLinks.js';
import { silentLogger, MemoryStorage } from '../reopen/fakes.js';
import { folder, link } from './fakes.js';

const entries = FolderTree.build(
  [
    folder('10', 'Hobbies', [
      link('11', 'Mahjong Soul', 'https://mahjongsoul.game.yo-star.com/'),
      folder('12', 'Nix', [link('13', 'Nix manual', 'https://nixos.org/manual')]),
    ]),
    folder('20', 'Music', [link('21', 'Radio', 'https://radio.example/')]),
  ],
  3,
);

const describe = (rows: Row[]): string[] => rows.map((row) => `${row.depth}:${row.title}${row.kind === 'link' && row.tab ? '*' : ''}`);

const tabOf = (key: string | null, title?: string): OpenTab => ({ tabId: 1, title, key, favIconUrl: undefined, active: false, unloaded: false });

const tabFor = (...open: string[]) => (link: LinkRef): OpenTab | undefined => (open.includes(link.key) ? tabOf(link.key) : undefined);

test('marks open links and keeps them visible below a closed folder', () => {
  const closed = FolderRows.build(entries, { isOpen: () => false, tabFor: tabFor('nixos.org/manual', 'mahjongsoul.game.yo-star.com') });
  assert.deepEqual(describe(closed), ['0:Hobbies', '1:Mahjong Soul*', '1:Nix manual*', '0:Music']);

  const nothingOpen = FolderRows.build(entries, { isOpen: () => false, tabFor: tabFor() });
  assert.deepEqual(describe(nothingOpen), ['0:Hobbies', '0:Music']);

  const opened = FolderRows.build(entries, { isOpen: (id) => id === '10', tabFor: tabFor('nixos.org/manual') });
  assert.deepEqual(describe(opened), ['0:Hobbies', '1:Mahjong Soul', '1:Nix', '2:Nix manual*', '0:Music']);
});

test('a link whose tab shows another page takes the title of that page', () => {
  const login = (link: LinkRef): OpenTab | undefined => (link.id === '11' ? tabOf('id.atlassian.com/login', 'Log in') : undefined);
  const rows = FolderRows.build(entries, { isOpen: (id) => id === '10', tabFor: login });
  assert.deepEqual(describe(rows), ['0:Hobbies', '1:Log in*', '1:Nix', '0:Music']);
});

test('remembers which folders are open', () => {
  const storage = new MemoryStorage();
  const before = new OpenFolders(storage, silentLogger());
  before.load();
  assert.equal(before.has('10'), false);
  before.toggle('10');
  before.toggle('12');
  before.toggle('12');

  const restarted = new OpenFolders(storage, silentLogger());
  restarted.load();
  assert.equal(restarted.has('10'), true);
  assert.equal(restarted.has('12'), false);
});

test('keeps folder states for the session when storage fails', () => {
  const broken = { getItem: (): string => 'not json', setItem: (): void => { throw new Error('full'); } };
  const folders = new OpenFolders(broken, silentLogger());
  folders.load();
  folders.toggle('10');
  assert.equal(folders.has('10'), true);
});
