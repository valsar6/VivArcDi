import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FolderTree } from '../../../src/modules/folders/FolderTree.js';
import type { FolderEntry, LinkEntry } from '../../../src/modules/folders/FolderTree.js';
import { folder, link } from './fakes.js';

test('builds the folder tree from the bookmarks keeping order and nesting', () => {
  const tree = FolderTree.build(
    [
      folder('10', 'Hobbies', [
        link('11', 'Mahjong Soul', 'https://mahjongsoul.game.yo-star.com/'),
        folder('12', 'Nix', [link('13', 'Nix manual', 'https://nixos.org/manual')]),
        link('14', 'Chess', 'https://www.chess.com/'),
      ]),
      link('15', 'Loose link', 'https://example.com/a'),
      folder('16', 'Music', []),
    ],
    3,
  );
  assert.deepEqual(
    tree.map((entry) => `${entry.kind}:${entry.title}`),
    ['folder:Hobbies', 'link:Loose link', 'folder:Music'],
  );
  const hobbies = tree[0] as FolderEntry;
  assert.deepEqual(
    hobbies.children.map((entry) => `${entry.kind}:${entry.title}:${entry.depth}`),
    ['link:Mahjong Soul:1', 'folder:Nix:1', 'link:Chess:1'],
  );
  assert.equal((hobbies.children[1] as FolderEntry).children[0]?.title, 'Nix manual');
  assert.equal((hobbies.children[2] as LinkEntry).key, 'chess.com');
});

test('skips separators, non-web links and folders beyond the depth limit', () => {
  const tree = FolderTree.build(
    [
      folder('1', 'One', [
        { id: '2', title: '---', separator: true },
        link('3', 'Settings', 'chrome://settings'),
        link('4', 'Script', 'javascript:void(0)'),
        link('5', 'File', 'file:///tmp/a.html'),
        link('6', 'Web', 'https://example.com/'),
        folder('7', 'Two', [folder('8', 'Three', [link('9', 'Deep link', 'https://example.com/deep')])]),
      ]),
    ],
    2,
  );
  const one = tree[0] as FolderEntry;
  assert.deepEqual(
    one.children.map((entry) => entry.title),
    ['Web', 'Two'],
  );
  assert.deepEqual((one.children[1] as FolderEntry).children, []);
});
