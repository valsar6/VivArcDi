import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BookmarkNode } from '../../../../src/core/browser/bookmarks/BookmarkNode.js';
import { BookmarkTrash } from '../../../../src/modules/folders/editing/BookmarkTrash.js';
import type { ToastKind } from '../../../../src/core/dom/Toast.js';
import { ClosingLinks } from '../../../../src/modules/folders/editing/ClosingLinks.js';
import { FolderDeletion } from '../../../../src/modules/folders/editing/FolderDeletion.js';
import { OpenFolders } from '../../../../src/modules/folders/tree/OpenFolders.js';
import { MemoryStorage, silentLogger } from '../../reopen/fakes.js';
import { FolderTabs, WritableChrome, folder, link } from '../fakes.js';

const linkedTo = (bookmarkId: string): string => JSON.stringify({ workspaceId: 7, vivarcdi: { bookmarkId } });

const tree = (withTrash = true): BookmarkNode[] => [
  folder('0', '', [
    folder('1', 'Bar', [folder('10', 'Hobbies', [link('11', 'A', 'https://a.example/'), folder('12', 'Deep', [link('13', 'B', 'https://b.example/')])]), link('14', 'C', 'https://c.example/')]),
    ...(withTrash ? [{ id: '4', title: 'Cestino', trash: true, children: [] } as BookmarkNode] : []),
  ]),
];

function setup(withTrash = true): {
  chrome: WritableChrome;
  tabs: FolderTabs;
  toasts: Array<[string, ToastKind | undefined]>;
  redraws: () => number;
  closing: ClosingLinks;
  open: OpenFolders;
  seen: string[];
  deletion: FolderDeletion;
} {
  const chrome = new WritableChrome(tree(withTrash));
  const tabs = new FolderTabs([
    { id: 1, vivExtData: linkedTo('11') },
    { id: 2, vivExtData: linkedTo('13') },
    { id: 3, vivExtData: linkedTo('14') },
    { id: 4, vivExtData: JSON.stringify({ workspaceId: 7 }) },
  ]);
  const toasts: Array<[string, ToastKind | undefined]> = [];
  let redraws = 0;
  const closing = new ClosingLinks();
  const seen: string[] = [];
  const open = new OpenFolders(new MemoryStorage(), silentLogger());
  open.useWorkspace(null);
  open.toggle('10');
  const writer = chrome.writer;
  const deletion = new FolderDeletion({
    writer,
    trash: new BookmarkTrash({ tree: (): Promise<BookmarkNode[]> => writer.tree() }),
    tabs: {
      query: (info): Promise<chrome.tabs.Tab[]> => tabs.query({ ...info }),
      remove: async (tabId): Promise<void> => {
        seen.push(`closing while held: ${closing.has('11')}`);
        await tabs.remove(tabId);
      },
    },
    openFolders: open,
    closing,
    redraw: (): void => void (redraws += 1),
    notify: (text, kind): void => void toasts.push([text, kind]),
    logger: silentLogger(),
  });
  return { chrome, tabs, toasts, redraws: (): number => redraws, closing, open, seen, deletion };
}

test('moves a deleted folder into the trash', async () => {
  const { chrome, deletion, open } = setup();
  await deletion.delete('10');
  assert.deepEqual(chrome.calls.filter((call) => call.startsWith('move')), ['move 10 4 undefined']);
  assert.equal(chrome.calls.some((call) => call.startsWith('remove')), false);
  assert.deepEqual(chrome.tree[0]?.children?.[1]?.children?.map((child) => child.id), ['10']);
  assert.equal(open.has('10'), false);
});

test('closes the tabs of the links of a deleted folder', async () => {
  const { tabs, deletion, closing, seen } = setup();
  await deletion.delete('10');
  assert.deepEqual(tabs.calls.filter(([name]) => name === 'remove'), [['remove', 1], ['remove', 2]]);
  assert.deepEqual([...tabs.tabs.keys()], [3, 4]);
  assert.deepEqual(seen, ['closing while held: true', 'closing while held: true']);
  assert.equal(closing.has('11'), false);
});

test('shows a toast after deleting a folder', async () => {
  const { toasts, deletion } = setup();
  await deletion.delete('10');
  assert.deepEqual(toasts, [['Folder "Hobbies" moved to Trash', undefined]]);
});

test('keeps the folder and its tabs when a folder action fails', async () => {
  for (const failure of ['trash', 'move']) {
    const { chrome, tabs, toasts, redraws, closing, deletion, open } = setup(failure !== 'trash');
    chrome.failing.add(failure === 'move' ? 'move' : 'none');
    await deletion.delete('10');
    assert.deepEqual(tabs.calls, []);
    assert.equal(tabs.tabs.size, 4);
    assert.deepEqual(toasts, [['Could not delete "Hobbies"', 'error']]);
    assert.equal(redraws(), 1);
    assert.equal(closing.has('11'), false);
    assert.equal(chrome.calls.some((call) => call.startsWith('remove')), false);
    assert.equal(chrome.tree[0]?.children?.[0]?.children?.[0]?.id, '10');
    assert.equal(open.has('10'), true);
  }
});
