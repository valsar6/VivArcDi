import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BookmarkNode } from '../../../../src/core/browser/bookmarks/BookmarkNode.js';
import type { ToastKind } from '../../../../src/core/dom/Toast.js';
import { LinkClipboard } from '../../../../src/modules/folders/editing/LinkClipboard.js';
import { silentLogger } from '../../reopen/fakes.js';
import { WritableChrome, folder, link } from '../fakes.js';

const tree = (): BookmarkNode[] => [folder('0', '', [folder('1', 'Bar', [link('5', 'Site', 'https://site.example/a'), folder('6', 'Dir')])])];

function setup(failing = false): { chrome: WritableChrome; copied: string[]; toasts: Array<[string, ToastKind | undefined]>; clipboard: LinkClipboard } {
  const chrome = new WritableChrome(tree());
  const copied: string[] = [];
  const toasts: Array<[string, ToastKind | undefined]> = [];
  const clipboard = new LinkClipboard({
    writer: chrome.writer,
    copier: {
      write: async (text): Promise<void> => {
        if (failing) {
          throw new Error('refused');
        }
        copied.push(text);
      },
    },
    notify: (text, kind): void => void toasts.push([text, kind]),
    logger: silentLogger(),
  });
  return { chrome, copied, toasts, clipboard };
}

test('copies the saved link of a row', async () => {
  const { copied, toasts, clipboard } = setup();
  await clipboard.copy('5');
  assert.deepEqual(copied, ['https://site.example/a']);
  assert.deepEqual(toasts, [['Copied', undefined]]);
});

test('shows the error toast when the copy is refused', async () => {
  const { copied, toasts, clipboard } = setup(true);
  await clipboard.copy('5');
  assert.deepEqual(copied, []);
  assert.deepEqual(toasts, [['Copy failed', 'error']]);
});

test('shows the error toast when the row has no address', async () => {
  const { copied, toasts, clipboard } = setup();
  await clipboard.copy('6');
  assert.deepEqual(copied, []);
  assert.deepEqual(toasts, [['Copy failed', 'error']]);
});
