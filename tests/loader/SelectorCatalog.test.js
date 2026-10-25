import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SelectorCatalog } from '../../src/core/SelectorCatalog.js';
import { FakeLoader } from './fakes.js';

test('bestMatch picks the exact major.minor', () => {
  assert.equal(SelectorCatalog.bestMatch(['8.0', '8.1', '8.2'], '8.1.3740.12'), '8.1');
});

test('bestMatch falls back to the newest older catalog', () => {
  assert.equal(SelectorCatalog.bestMatch(['7.9', '8.1'], '8.3.1.1'), '8.1');
});

test('bestMatch sorts versions numerically', () => {
  assert.equal(SelectorCatalog.bestMatch(['8.9', '8.10'], '8.10.1'), '8.10');
});

test('bestMatch returns null when every catalog is newer', () => {
  assert.equal(SelectorCatalog.bestMatch(['8.1'], '7.5.1.1'), null);
});

test('bestMatch uses the newest catalog for an unknown version', () => {
  assert.equal(SelectorCatalog.bestMatch(['8.0', '8.1'], 'unknown'), '8.1');
});

test('load reads the matching selector file', async () => {
  const loader = new FakeLoader({
    'selectors/index.json': { versions: ['8.1'] },
    'selectors/8.1.json': { browser: '#browser' },
  });
  const catalog = await SelectorCatalog.load(loader, '8.1.3740.12');
  assert.equal(catalog.version, '8.1');
  assert.equal(catalog.get('browser'), '#browser');
});

test('get throws for an undefined selector', () => {
  const catalog = new SelectorCatalog({}, '8.1');
  assert.throws(() => catalog.get('missing'), /not defined/);
});
