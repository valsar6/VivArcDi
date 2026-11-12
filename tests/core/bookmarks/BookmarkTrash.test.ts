import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BookmarkNode } from '../../../src/core/bookmarks/BookmarkNode.js';
import { BookmarkTrash } from '../../../src/core/bookmarks/BookmarkTrash.js';
import { folder } from '../../modules/folders/fakes.js';

const withTrash = (): BookmarkNode[] => [folder('0', '', [folder('1', 'Bar'), folder('2', 'Other'), { id: '4', title: 'Cestino', trash: true, children: [] }])];

const counting = (tree: BookmarkNode[]): { trash: BookmarkTrash; reads: () => number } => {
  let reads = 0;
  const trash = new BookmarkTrash({ tree: async (): Promise<BookmarkNode[]> => (reads += 1, tree) });
  return { trash, reads: (): number => reads };
};

test('finds the top-level node marked as trash', async () => {
  assert.equal(await counting(withTrash()).trash.id(), '4');
});

test('reads the tree once and keeps the id', async () => {
  const { trash, reads } = counting(withTrash());
  await trash.id();
  await trash.id();
  assert.equal(reads(), 1);
});

test('gives null when the tree has no trash', async () => {
  assert.equal(await counting([folder('0', '', [folder('1', 'Bar')])]).trash.id(), null);
});
