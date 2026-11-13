import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserBookmarks } from '../../../src/core/browser/bookmarks/BrowserBookmarks.js';
import type { BookmarksHost } from '../../../src/core/browser/bookmarks/BrowserBookmarks.js';
import { BrowserHistory } from '../../../src/core/browser/BrowserHistory.js';
import type { ChromeApi } from '../../../src/core/browser/BrowserTabs.js';
import { Logger } from '../../../src/core/support/Logger.js';
import { BookmarkSuggestions } from '../../../src/modules/littlearc/commandbar/BookmarkSuggestions.js';
import { CommandBarController } from '../../../src/modules/littlearc/commandbar/CommandBarController.js';
import { keyCommand } from '../../../src/modules/littlearc/commandbar/CommandBarKeys.js';
import { HistorySuggestions } from '../../../src/modules/littlearc/commandbar/HistorySuggestions.js';
import { MiddleEllipsis } from '../../../src/modules/littlearc/commandbar/MiddleEllipsis.js';
import { SelectionCursor } from '../../../src/modules/littlearc/commandbar/SelectionCursor.js';
import { suggestionOf } from '../../../src/modules/littlearc/commandbar/Suggestion.js';
import type { Suggestion, SuggestionOrigin } from '../../../src/modules/littlearc/commandbar/Suggestion.js';
import { SuggestionList } from '../../../src/modules/littlearc/commandbar/SuggestionList.js';
import { SuggestionRanker } from '../../../src/modules/littlearc/commandbar/SuggestionRanker.js';
import type { SuggestionSource } from '../../../src/modules/littlearc/commandbar/SuggestionSource.js';
import { TabSuggestions } from '../../../src/modules/littlearc/commandbar/TabSuggestions.js';
import { SilentSink } from '../../loader/fakes.js';

const logger = new Logger('test', new SilentSink());

const entry = (source: SuggestionOrigin, url: string, title: string): Suggestion => {
  const made = suggestionOf(source, url, title);
  assert.notEqual(made, null);
  return made as Suggestion;
};

const titles = (suggestions: Suggestion[]): string[] => suggestions.map((suggestion) => suggestion.title);

test('suggestion ranker puts the best match first', () => {
  const history = [
    entry('history', 'https://a.example/1', 'Best cinema times'),
    entry('history', 'https://a.example/2', 'Rome: cinema guide'),
    entry('history', 'https://cinema.example/', 'Listings'),
    entry('history', 'https://a.example/4', 'Cinéma Paradiso'),
    entry('history', 'https://a.example/5', 'Unrelated page'),
  ];
  assert.deepEqual(titles(SuggestionRanker.rank('CINEMA', [history], 5)), ['Listings', 'Cinéma Paradiso', 'Best cinema times', 'Rome: cinema guide']);
  assert.deepEqual(titles(SuggestionRanker.rank('cinem', [[entry('tab', 'https://x.example/', 'The cinema'), entry('tab', 'https://x.example/cinema-list', 'Listings')]], 5)), ['The cinema', 'Listings']);
});

test('suggestion ranker removes duplicate addresses', () => {
  const tab = entry('tab', 'https://www.example.com/page/#top', 'Example tab');
  const bookmark = entry('bookmark', 'http://example.com/page', 'Example bookmark');
  const history = entry('history', 'https://example.com/page/', 'Example history');
  const other = entry('history', 'https://example.com/page?id=2', 'Example other');
  const ranked = SuggestionRanker.rank('example', [[tab], [bookmark], [history, other]], 5);
  assert.deepEqual(titles(ranked), ['Example tab', 'Example other']);
  assert.deepEqual(titles(SuggestionRanker.rank('example', [[], [bookmark], [history]], 5)), ['Example bookmark']);
});

test('suggestion ranker keeps web addresses and limits the list', () => {
  const mixed = [
    entry('history', 'vivaldi://settings', 'Settings'),
    entry('history', 'about:blank', 'Settings blank'),
    entry('history', 'file:///tmp/settings.html', 'Settings file'),
    entry('history', 'chrome://history', 'Settings history'),
    entry('history', 'https://a.example/1', 'Settings one'),
    entry('history', 'https://a.example/2', 'Settings two'),
    entry('history', 'http://a.example/3', 'Settings three'),
  ];
  assert.deepEqual(titles(SuggestionRanker.rank('settings', [mixed], 5)), ['Settings one', 'Settings two', 'Settings three']);
  assert.deepEqual(titles(SuggestionRanker.rank('settings', [mixed], 2)), ['Settings one', 'Settings two']);
});

class FixedSource implements SuggestionSource {
  public readonly name: string;
  public asked: Array<[string, number]> = [];
  #result: Suggestion[] | Error;

  constructor(name: string, result: Suggestion[] | Error) {
    this.name = name;
    this.#result = result;
  }

  public async suggest(text: string, limit: number): Promise<Suggestion[]> {
    this.asked.push([text, limit]);
    if (this.#result instanceof Error) {
      throw this.#result;
    }
    return this.#result;
  }
}

test('suggestion list for an empty field shows the most recent pages', async () => {
  const pages = ['one', 'two', 'three', 'four', 'five', 'six'].map((name) => entry('history', `https://${name}.example/`, name));
  const recent = new FixedSource('history', [entry('history', 'about:blank', 'blank'), pages[0] as Suggestion, entry('history', 'https://www.one.example', 'one again'), ...pages.slice(1)]);
  const tabs = new FixedSource('tabs', [entry('tab', 'https://tab.example/', 'tab')]);
  const list = new SuggestionList({ typed: [tabs], recent }, logger);
  assert.deepEqual(titles(await list.suggest('', 5)), ['one', 'two', 'three', 'four', 'five']);
  assert.deepEqual(tabs.asked, []);
  assert.deepEqual(titles(await new SuggestionList({ typed: [], recent: new FixedSource('history', []) }, logger).suggest('  ', 5)), []);
});

test('suggestion sources survive a failing source', async () => {
  const warned: string[] = [];
  const quiet = { ...logger, warn: (message: string): void => void warned.push(message) } as unknown as Logger;
  const broken = new FixedSource('bookmarks', new Error('no bookmarks'));
  const working = new FixedSource('history', [entry('history', 'https://a.example/', 'Alpha')]);
  const list = new SuggestionList({ typed: [broken, working], recent: broken }, quiet);
  assert.deepEqual(titles(await list.suggest('alp', 5)), ['Alpha']);
  assert.deepEqual(titles(await list.suggest('alp', 5)), ['Alpha']);
  assert.deepEqual(await list.suggest('', 5), []);
  assert.equal(warned.length, 1);
});

test('suggestion sources read open tabs, bookmarks and history', async () => {
  const tabs = {
    query: async (info: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> => {
      assert.deepEqual(info, { windowType: 'normal' });
      return [
        { windowId: 1, url: 'https://www.news.example/a', title: 'News today', favIconUrl: 'https://news.example/icon.png' },
        { windowId: 2, url: 'https://news.example/little', title: 'News in Little Arc' },
        { windowId: 1, url: 'https://news.example/private', title: 'News private', incognito: true },
        { windowId: 1, url: 'https://other.example/', title: 'Other' },
      ] as unknown as chrome.tabs.Tab[];
    },
  };
  const found = await new TabSuggestions(tabs, (id) => id === 2).suggest('news', 5);
  assert.deepEqual(found, [{ url: 'https://www.news.example/a', title: 'News today', host: 'news.example', source: 'tab', favicon: 'https://news.example/icon.png' }]);
  assert.deepEqual(await new TabSuggestions(tabs, () => false).suggest('', 5), []);
  const bookmarks = { search: async (text: string): Promise<Array<{ id: string; title: string; url?: string }>> => (text === 'ex' ? [{ id: '1', title: 'Folder' }, { id: '2', title: 'Example', url: 'https://example.com/' }] : []) };
  assert.deepEqual((await new BookmarkSuggestions(bookmarks).suggest(' ex ', 5)).map((item) => item.source + item.title), ['bookmarkExample']);
  assert.deepEqual(await new BookmarkSuggestions(bookmarks).suggest('', 5), []);
  const asked: Array<[string, number]> = [];
  const history = { search: async (text: string, max: number): Promise<Array<{ url: string; title: string }>> => (asked.push([text, max]), [{ url: 'https://h.example/', title: '' }, { url: 'bad', title: 'x' }]) };
  assert.deepEqual((await new HistorySuggestions(history).suggest('', 20)).map((item) => item.title), ['h.example']);
  assert.deepEqual(asked, [['', 20]]);
});

test('middle ellipsis keeps the start and the end of a long host', () => {
  assert.equal(MiddleEllipsis.of('membership.example-platform.com', 21).length, 21);
  assert.equal(MiddleEllipsis.of('membership.example-platform.com', 21), 'membership…atform.com');
  assert.equal(MiddleEllipsis.of('google.com', 22), 'google.com');
  assert.equal(MiddleEllipsis.of('abcdefghij', 10), 'abcdefghij');
  assert.equal(MiddleEllipsis.of('abcdefghijk', 6), 'ab…ijk');
  assert.equal(MiddleEllipsis.of('abcdefghijk', 1), '…');
});

test('selection cursor wraps around and resets with the list', () => {
  const cursor = new SelectionCursor();
  cursor.up();
  cursor.down();
  assert.equal(cursor.index, 0);
  cursor.reset(3);
  assert.equal(cursor.index, 0);
  cursor.up();
  assert.equal(cursor.index, 2);
  cursor.down();
  assert.equal(cursor.index, 0);
  cursor.down();
  cursor.down();
  assert.equal(cursor.index, 2);
  cursor.select(1);
  assert.equal(cursor.index, 1);
  cursor.select(7);
  cursor.select(-1);
  assert.equal(cursor.index, 1);
  cursor.reset(2);
  assert.equal(cursor.index, 0);
});

test('command bar keys map the arrows, Enter and Esc', () => {
  const press = (key: string, isComposing = false): ReturnType<typeof keyCommand> => keyCommand({ key, isComposing });
  assert.equal(press('ArrowUp'), 'up');
  assert.equal(press('ArrowDown'), 'down');
  assert.equal(press('Enter'), 'submit');
  assert.equal(press('Escape'), 'dismiss');
  assert.equal(press('a'), null);
  assert.equal(press('Enter', true), null);
});

class FakeLauncher {
  public opened: string[] = [];

  public async openAddress(url: string): Promise<boolean> {
    this.opened.push(url);
    return true;
  }
}

function controllerWith(suggestions: Suggestion[]): { controller: CommandBarController; launcher: FakeLauncher; asked: Array<[string, number]> } {
  const launcher = new FakeLauncher();
  const asked: Array<[string, number]> = [];
  const list = { suggest: async (text: string, limit: number): Promise<Suggestion[]> => (asked.push([text, limit]), suggestions.slice(0, limit)) };
  return { controller: new CommandBarController({ list, launcher, logger }), launcher, asked };
}

const known = [entry('tab', 'https://google.com/', 'Google'), entry('history', 'https://example.org/', 'Example')];

test('command bar opens the typed text in little arc', async () => {
  const { controller, launcher, asked } = controllerWith(known);
  await controller.open();
  await controller.type('cinema times');
  assert.deepEqual(asked.at(-1), ['cinema times', 4]);
  assert.equal(controller.state.rows[0]?.title, 'Search for cinema times');
  assert.equal(await controller.submit(), true);
  assert.deepEqual(launcher.opened, ['https://duckduckgo.com/?q=cinema%20times']);
  assert.equal(controller.state.open, false);
  await controller.open();
  await controller.type('example.com/a');
  assert.equal(controller.state.rows[0]?.title, 'Open example.com');
  await controller.submit();
  assert.deepEqual(launcher.opened.at(-1), 'https://example.com/a');
});

test('command bar opens the selected suggestion in little arc', async () => {
  const { controller, launcher, asked } = controllerWith(known);
  await controller.open();
  assert.deepEqual(asked, [['', 5]]);
  assert.deepEqual(controller.state.rows.map((row) => row.title), ['Google', 'Example']);
  controller.down();
  await controller.submit();
  assert.deepEqual(launcher.opened, ['https://example.org/']);
  await controller.open();
  await controller.type('goo');
  assert.equal(controller.state.selected, 0);
  assert.equal(await controller.activate(1), true);
  assert.deepEqual(launcher.opened.at(-1), 'https://google.com/');
  await controller.open();
  const none = controllerWith([]);
  await none.controller.open();
  assert.equal(await none.controller.submit(), false);
  assert.deepEqual(none.launcher.opened, []);
});

test('command bar opens nothing when it is dismissed', async () => {
  const { controller, launcher } = controllerWith(known);
  const states: boolean[] = [];
  controller.onChange((state) => states.push(state.open));
  await controller.open();
  await controller.type('goo');
  controller.dismiss();
  assert.equal(controller.state.open, false);
  assert.equal(await controller.submit(), false);
  assert.deepEqual(launcher.opened, []);
  assert.equal(states.at(-1), false);
  await controller.open();
  const pending = controller.type('later');
  controller.dismiss();
  await pending;
  assert.deepEqual(controller.state.rows, []);
});

test('browser history and bookmarks search wrap their callbacks', async () => {
  const calls: unknown[] = [];
  const chromeApi = { history: { search: (query: unknown, callback: (items: unknown[]) => void): void => (calls.push(query), callback([{ url: 'https://a.example/' }])) } } as unknown as ChromeApi;
  const history = new BrowserHistory(chromeApi);
  assert.equal(history.available, true);
  assert.deepEqual(await history.search('', 5), [{ url: 'https://a.example/' }]);
  assert.deepEqual(calls, [{ text: '', maxResults: 5, startTime: 0 }]);
  assert.equal(new BrowserHistory(undefined).available, false);
  await assert.rejects(new BrowserHistory(undefined).search('x', 1), /not available/);
  const failing = { history: { search: (_query: unknown, callback: () => void): void => callback() }, runtime: { lastError: { message: 'boom' } } } as unknown as ChromeApi;
  await assert.rejects(new BrowserHistory(failing).search('x', 1), /boom/);
  const host = { bookmarks: { getTree: (): void => undefined, search: (text: string, callback: (nodes: unknown[]) => void): void => callback([{ id: text }]) } } as unknown as BookmarksHost;
  assert.deepEqual(await new BrowserBookmarks(host).search('7'), [{ id: '7' }]);
  const bare = { bookmarks: { getTree: (): void => undefined } } as unknown as BookmarksHost;
  await assert.rejects(new BrowserBookmarks(bare).search('x'), /search is not available/);
});
