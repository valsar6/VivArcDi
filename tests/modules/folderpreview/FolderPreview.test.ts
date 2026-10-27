import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserBookmarks } from '../../../src/core/bookmarks/BrowserBookmarks.js';
import { SelectorCatalog } from '../../../src/core/SelectorCatalog.js';
import type { ModuleContext } from '../../../src/core/Module.js';
import { FolderPreview } from '../../../src/modules/folderpreview/FolderPreview.js';
import { DomDocument, asDocument } from '../../core/dom.js';
import { MemoryStorage, silentLogger } from '../reopen/fakes.js';
import { FolderTabs, bookmarkTree, folder, link, recordingChrome } from '../folders/fakes.js';

function context(dom: DomDocument, bookmarks: BrowserBookmarks): ModuleContext {
  dom.defaultView = { navigator: { language: 'it' } };
  return {
    document: asDocument(dom),
    selectors: new SelectorCatalog({ browser: '.browser', tabBar: '.bar' }, 'test'),
    logger: silentLogger(),
    options: { hoverDelayMs: 50 },
    tabs: new FolderTabs(),
    storage: new MemoryStorage(),
    bookmarks,
  } as unknown as ModuleContext;
}

test('folder panel listens to the pointer and stops cleanly', () => {
  const dom = new DomDocument();
  dom.querySelector = (): DomDocument['list'] => dom.list;
  const module = new FolderPreview();
  module.start(context(dom, recordingChrome(bookmarkTree([folder('10', 'Hobbies', [link('11', 'Chess', 'https://chess.com/')])])).bookmarks));
  assert.equal(dom.listeners.get('mouseover')?.length, 1);
  module.stop();
  assert.equal(dom.listeners.get('mouseover')?.length, 0);
  assert.equal(dom.listeners.get('click')?.length, 0);
});

test('folder panel stays off without chrome.bookmarks', () => {
  const dom = new DomDocument();
  dom.querySelector = (): DomDocument['list'] => dom.list;
  new FolderPreview().start(context(dom, new BrowserBookmarks(undefined)));
  assert.equal(dom.listeners.size, 0);
});
