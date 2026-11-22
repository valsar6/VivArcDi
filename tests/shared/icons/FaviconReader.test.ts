import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FaviconReader } from '../../../src/shared/icons/FaviconReader.js';
import type { FaviconReaderDependencies, PageParser } from '../../../src/shared/icons/FaviconReader.js';
import { Logger } from '../../../src/core/support/Logger.js';

interface IconLink {
  href: string;
  sizes?: string;
}

interface Setup {
  reader: FaviconReader;
  fetched: string[];
  loaded: string[];
  warnings: unknown[][];
}

interface Options {
  pages?: Record<string, string | Error>;
  links?: Record<string, IconLink[]>;
  broken?: string[];
}

function setUp(options: Options = {}): Setup {
  const fetched: string[] = [];
  const loaded: string[] = [];
  const warnings: unknown[][] = [];
  const parser: PageParser = {
    parseFromString: (html) => ({
      querySelectorAll: () => (options.links?.[html] ?? []).map((link) => ({ getAttribute: (name: string) => (name === 'href' ? link.href : (link.sizes ?? null)) })),
    }),
  };
  const dependencies: FaviconReaderDependencies = {
    fetch: async (url) => {
      fetched.push(url);
      const page = options.pages?.[url];
      if (page instanceof Error) throw page;
      if (page === undefined) return { ok: false, text: async () => '' };
      return { ok: true, text: async () => page };
    },
    loadImage: async (url) => {
      loaded.push(url);
      return !options.broken?.includes(url);
    },
    parser,
    logger: new Logger('test', { info: (): void => undefined, error: (): void => undefined, warn: (...message: unknown[]): void => void warnings.push(message) }),
  };
  return { reader: new FaviconReader(dependencies), fetched, loaded, warnings };
}

const tabOf = (favIconUrl: string | undefined): chrome.tabs.Tab => ({ favIconUrl }) as chrome.tabs.Tab;

test('reads the favicon of the open tab without fetching', async () => {
  const { reader, fetched } = setUp();
  const url = await reader.read({ url: 'https://a.test/', tab: tabOf('https://a.test/icon.png') });
  assert.equal(url, 'https://a.test/icon.png');
  assert.deepEqual(fetched, []);
});

test('falls to the page when the link has no open tab', async () => {
  const { reader, fetched } = setUp({ pages: { 'https://a.test/x': 'PAGE' }, links: { PAGE: [{ href: '/touch.png' }] } });
  assert.equal(await reader.read({ url: 'https://a.test/x' }), 'https://a.test/touch.png');
  assert.deepEqual(fetched, ['https://a.test/x']);
});

test('falls to the page when the tab has no favicon or it does not load', async () => {
  const { reader } = setUp({ pages: { 'https://a.test/': 'P' }, links: { P: [{ href: 'b.png' }] }, broken: ['https://a.test/dead.png'] });
  assert.equal(await reader.read({ url: 'https://a.test/', tab: tabOf(undefined) }), 'https://a.test/b.png');
  assert.equal(await reader.read({ url: 'https://a.test/', tab: tabOf('https://a.test/dead.png') }), 'https://a.test/b.png');
});

test('takes the largest icon link of the page', async () => {
  const links = [{ href: 'small.png', sizes: '16x16' }, { href: 'big.png', sizes: '64x64' }, { href: 'mid.png', sizes: '32x32' }];
  const { reader } = setUp({ pages: { 'https://a.test/': 'P' }, links: { P: links } });
  assert.equal(await reader.read({ url: 'https://a.test/' }), 'https://a.test/big.png');
});

test('falls to favicon.ico when the page has no usable link', async () => {
  const { reader } = setUp({ pages: { 'https://a.test/dir/page': 'P' }, links: { P: [{ href: 'x.png' }] }, broken: ['https://a.test/dir/x.png'] });
  assert.equal(await reader.read({ url: 'https://a.test/dir/page' }), 'https://a.test/favicon.ico');
});

test('gives null when no plan finds a favicon', async () => {
  const { reader } = setUp({ pages: { 'https://a.test/': 'P' }, broken: ['https://a.test/favicon.ico'] });
  assert.equal(await reader.read({ url: 'https://a.test/' }), null);
});

test('gives null for an address that is not http or https', async () => {
  const { reader, fetched } = setUp();
  for (const url of ['chrome://settings', 'file:///a.html', 'about:blank', 'not a url', '']) {
    assert.equal(await reader.read({ url, tab: tabOf('https://a.test/i.png') }), null);
  }
  assert.deepEqual(fetched, []);
});

test('gives null for a data result longer than 8 KB and keeps a short one', async () => {
  const long = `data:image/png;base64,${'A'.repeat(8 * 1024)}`;
  const { reader } = setUp({ pages: { 'https://a.test/': 'P' }, broken: ['https://a.test/favicon.ico'], links: { P: [{ href: long }] } });
  assert.equal(await reader.read({ url: 'https://a.test/', tab: tabOf(long) }), null);
  const short = 'data:image/png;base64,AAAA';
  assert.equal(await reader.read({ url: 'https://a.test/', tab: tabOf(short) }), short);
});

test('never throws when the fetch or the image fails', async () => {
  const { reader, warnings } = setUp({ pages: { 'https://a.test/': new Error('offline') }, broken: ['https://a.test/favicon.ico'] });
  assert.equal(await reader.read({ url: 'https://a.test/' }), null);
  assert.equal(warnings.length, 1);
});
