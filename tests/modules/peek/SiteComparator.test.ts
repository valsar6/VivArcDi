import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SiteComparator } from '../../../src/modules/peek/SiteComparator.js';

const sites = new SiteComparator();

test('site comparison matches subdomains of the same registrable domain', () => {
  assert.ok(sites.sameSite('https://mail.google.com/inbox', 'https://docs.google.com/document'));
  assert.ok(sites.sameSite('https://www.example.com/', 'https://example.com/about'));
  assert.ok(sites.sameSite('https://WWW.Example.COM./', 'http://example.com'));
  assert.equal(sites.sameSite('https://mail.google.com/', 'https://www.youtube.com/'), false);
});

test('site comparison keeps two-label public suffixes apart', () => {
  assert.equal(sites.siteOf('https://www.bbc.co.uk/news'), 'bbc.co.uk');
  assert.ok(sites.sameSite('https://news.bbc.co.uk/', 'https://www.bbc.co.uk/'));
  assert.equal(sites.sameSite('https://bbc.co.uk/', 'https://amazon.co.uk/'), false);
  assert.equal(sites.sameSite('https://alice.github.io/', 'https://bob.github.io/'), false);
});

test('site comparison keeps IP addresses and single-label hosts whole', () => {
  assert.equal(sites.siteOf('http://192.168.1.10:8080/'), '192.168.1.10');
  assert.equal(sites.siteOf('http://localhost:3000/'), 'localhost');
  assert.equal(sites.sameSite('http://10.0.0.1/', 'http://10.0.0.2/'), false);
});

test('site comparison treats URLs without a host as no site', () => {
  assert.equal(sites.siteOf('about:blank'), null);
  assert.equal(sites.siteOf('not a url'), null);
  assert.equal(sites.sameSite('about:blank', 'about:blank'), false);
});
