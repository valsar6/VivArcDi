import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const STYLES = fileURLToPath(new URL('../../src/styles/', import.meta.url));
const read = (name: string): string => readFileSync(`${STYLES}${name}`, 'utf8');
const compiled = (): string => sass.compile(`${STYLES}pinned.scss`).css;

const ROW = '#browser\\[data-vivarcdi-active\\]\\[data-vivarcdi-pinned-unload\\] \\.tab-position\\.is-pinned';
const MINUS = '\\[data-vivarcdi-pinned-minus\\]';

test('draws the close button of a pinned row as a minus', () => {
  const tokens = read('_tokens.scss');
  const source = read('pinned.scss');
  const css = compiled();
  assert.match(tokens, /\$minus-glyph: url\("data:image\/svg\+xml/);
  assert.ok(source.includes('$minus-glyph'), '$minus-glyph is used');
  const base = new RegExp(`${ROW} ${MINUS} \\{([^}]*)\\}`).exec(css)?.[1] ?? '';
  assert.match(base, /opacity: 0;/);
  assert.match(base, /pointer-events: none/);
  assert.match(base, /mask: url\("data:image\/svg\+xml/);
  assert.match(css, /\.tab-position\.is-pinned:hover \[data-vivarcdi-pinned-minus\][^{]*\{[^}]*opacity: 1/);
  assert.match(css, /\.tab-position\.is-pinned:has\(\.tab\.active\) \[data-vivarcdi-pinned-minus\]/);
  assert.match(css, /\.tab-position\.is-pinned \.tab-header \.close[^{]*\{[^}]*display: none/);
  assert.equal(css.includes('data-vivarcdi-tile'), false);
});
