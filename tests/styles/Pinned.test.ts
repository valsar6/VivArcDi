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

test('draws the pinned row minus as a badge like Arc', () => {
  const tokens = read('_tokens.scss');
  const css = compiled();
  assert.match(tokens, /\$minus-glyph: url\("data:image\/svg\+xml/);
  assert.match(tokens, /\$minus-badge-size: 21px/);
  assert.match(tokens, /\$minus-badge-radius: 5px/);
  assert.match(tokens, /\$minus-size: 16px/);
  const base = new RegExp(`${ROW} ${MINUS} \\{([^}]*)\\}`).exec(css)?.[1] ?? '';
  assert.match(base, /width: 21px;/);
  assert.match(base, /height: 21px;/);
  assert.match(base, /border-radius: 5px;/);
  assert.match(base, /background-color: color-mix\(/);
  assert.match(base, /opacity: 0;/);
  assert.match(base, /pointer-events: none/);
  assert.equal(/mask:/.test(base), false);
  const dash = new RegExp(`${ROW} ${MINUS}::before \\{([^}]*)\\}`).exec(css)?.[1] ?? '';
  assert.match(dash, /width: 16px;/);
  assert.match(dash, /mask: url\("data:image\/svg\+xml/);
  assert.match(css, /\.tab-position\.is-pinned \.tab-header \.close[^{]*\{[^}]*display: none/);
  assert.equal(css.includes('data-vivarcdi-tile'), false);
});

test('shows the pinned row minus on hover and on the current row', () => {
  const css = compiled();
  assert.match(css, /\.tab-position\.is-pinned:hover \[data-vivarcdi-pinned-minus\][^{]*\{[^}]*opacity: 1/);
  assert.match(css, /\.tab-position\.is-pinned:has\(\.tab\.active\) \[data-vivarcdi-pinned-minus\]/);
});
