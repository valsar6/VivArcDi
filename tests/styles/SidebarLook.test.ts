import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';
import { Palettes } from '../../src/modules/sidebarlook/Palettes.js';

const STYLES = fileURLToPath(new URL('../../src/styles/', import.meta.url));
const read = (name: string): string => readFileSync(`${STYLES}${name}`, 'utf8');
const compiled = (): string => sass.compile(`${STYLES}sidebar-look.scss`).css;

const TOKENS: Array<[string, string]> = [
  ['$row-height', '36px'],
  ['$row-gap', '2px'],
  ['$row-radius', '8px'],
  ['$veil', '22%'],
  ['$hover-veil', '35%'],
  ['$scrollbar-width', '6px'],
  ['$pill-shadow', '0 1px 2px rgb(0 0 0 / 12%)'],
];

test('sidebar look uses tokens', () => {
  const tokens = read('_tokens.scss');
  const source = read('sidebar-look.scss');
  const css = compiled();
  for (const [name, value] of TOKENS) {
    assert.ok(tokens.includes(`${name}: ${value};`), `${name} is defined as ${value}`);
    assert.ok(source.includes(name), `${name} is used`);
    assert.equal(source.includes(value), false, `${value} is not repeated in the stylesheet`);
  }
  assert.match(css, /height: 36px/);
  assert.match(css, /margin-bottom: 2px/);
  assert.match(css, /border-radius: 8px/);
  assert.match(css, /white 22%/);
  assert.match(css, /white 35%/);
  assert.match(css, /width: 6px/);
});

test('sidebar look rules all sit under the look mark', () => {
  const selectors = [...compiled().matchAll(/^([^\s@}][^{]*)\{/gm)].flatMap(([, list]) => (list ?? '').split(/,\n/));
  assert.ok(selectors.length > 0);
  for (const selector of selectors) {
    assert.ok(selector.trim().startsWith('#browser[data-vivarcdi-look]'), selector);
  }
});

test('the stylesheet falls back to the sky palette', () => {
  const sky = Palettes.byName('sky');
  const css = compiled();
  assert.ok(css.includes(`--vivarcdi-space: var(--vivarcdi-space-theme, ${sky.space})`));
  assert.ok(css.includes(`--vivarcdi-pill: var(--vivarcdi-pill-theme, ${sky.pill})`));
  assert.ok(css.includes(`--vivarcdi-ink: var(--vivarcdi-ink-theme, ${sky.ink})`));
});
