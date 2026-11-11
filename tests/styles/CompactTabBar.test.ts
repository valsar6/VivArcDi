import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const STYLES = fileURLToPath(new URL('../../src/styles/', import.meta.url));
const read = (name: string): string => readFileSync(`${STYLES}${name}`, 'utf8');
const compiled = (): string => sass.compile(`${STYLES}compact-tab-bar.scss`).css;
const selectors = (): string[] => [...compiled().matchAll(/^([^\s@}][^{]*)\{/gm)].flatMap(([, list]) => (list ?? '').split(/,\n/)).map((selector) => selector.trim());
const NARROW = '#browser[data-vivarcdi-active]:has(#tabs-tabbar-container.narrow)';

const TOKENS: Array<[string, string]> = [
  ['$narrow-tab-bar', "'#tabs-tabbar-container.narrow'"],
  ['$chevron-size', '10px'],
  ['$chevron-gap', '2px'],
  ['$archive-icon-size', '18px'],
];

test('compact rules apply only to the narrow tab bar', () => {
  const list = selectors();
  assert.ok(list.length > 0);
  for (const selector of list) {
    assert.ok(selector.startsWith(NARROW), selector);
  }
  for (const row of ['[data-vivarcdi-space-header]', '[data-vivarcdi-new-tab-row]', '[data-vivarcdi-archive-footer]']) {
    assert.ok(list.some((selector) => selector.includes(row)), `${row} has a compact rule`);
  }
});

test('wide tab bar keeps the full rows', () => {
  const css = compiled();
  assert.equal(css.includes('display: none'), true);
  for (const selector of selectors()) {
    assert.ok(selector.includes(':has(#tabs-tabbar-container.narrow)'), selector);
  }
  for (const name of ['space-header.scss', 'today.scss', 'sidebar-look.scss']) {
    assert.equal(read(name).includes('narrow'), false, `${name} has no narrow rule`);
  }
});

test('compact header chevron follows the collapsed state', () => {
  const css = compiled();
  const rotated = [...css.matchAll(/([^{}]+)\{[^}]*transform: rotate\(180deg\)/g)].map(([, selector]) => (selector ?? '').trim());
  assert.deepEqual(rotated, [`${NARROW} [data-vivarcdi-space-header][data-vivarcdi-collapsed]::after`]);
  assert.ok(read('_tokens.scss').includes("M3.47 10.47 8 5.94l4.53 4.53"), 'the default chevron points up');
});

test('compact tab bar uses tokens', () => {
  const tokens = read('_tokens.scss');
  const source = read('compact-tab-bar.scss');
  for (const [name, value] of TOKENS) {
    assert.ok(tokens.includes(`${name}: ${value};`), `${name} is defined as ${value}`);
    assert.ok(source.includes(name), `${name} is used`);
  }
  for (const glyph of ['$chevron-glyph', '$archive-glyph']) {
    assert.ok(tokens.includes(`${glyph}: url("data:image/svg+xml,`), `${glyph} is a token`);
    assert.ok(source.includes(glyph), `${glyph} is used`);
  }
  assert.equal(source.includes('data:image'), false, 'no glyph is inlined in the stylesheet');
  assert.equal(source.includes('px'), false, 'no size is inlined in the stylesheet');
});
