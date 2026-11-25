import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const STYLES = fileURLToPath(new URL('../../src/styles/', import.meta.url));
const read = (name: string): string => readFileSync(`${STYLES}${name}`, 'utf8');
const compiled = (): string => sass.compile(`${STYLES}favorites.scss`).css;

const SOURCE = '\\[data-vivarcdi-tiles\\]\\[data-vivarcdi-tile-source=pinned\\]';
const MINUS = '\\[data-vivarcdi-tile-minus\\]';

test('draws the pinned tile minus as the same badge', () => {
  const tokens = read('_tokens.scss');
  const css = compiled();
  assert.match(tokens, /\$tile-minus: '\[data-vivarcdi-tile-minus\]'/);
  assert.match(tokens, /\$minus-badge-size: 21px/);
  assert.match(tokens, /\$minus-badge-radius: 5px/);
  assert.match(tokens, /\$minus-size: 16px/);
  const base = new RegExp(`${SOURCE}[^{]*${MINUS}[^{]*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
  assert.match(base, /width: 21px;/);
  assert.match(base, /height: 21px;/);
  assert.match(base, /border-radius: 5px;/);
  assert.equal(/background-color:/.test(base), false);
  assert.match(base, /opacity: 0;/);
  assert.match(base, /pointer-events: none/);
  assert.equal(/mask:/.test(base), false);
  const dash = new RegExp(`${SOURCE}[^{]*${MINUS}::before \\{([^}]*)\\}`).exec(css)?.[1] ?? '';
  assert.match(dash, /width: 16px;/);
  assert.match(dash, /mask: url\("data:image\/svg\+xml/);
});

test('shows the pinned tile minus only while the tile is hovered', () => {
  const css = compiled();
  assert.match(css, /\[data-vivarcdi-tile\]:hover \[data-vivarcdi-tile-minus\][^{]*\{[^}]*opacity: 1/);
  assert.equal(/\[data-vivarcdi-tile\]\[data-vivarcdi-current\] \[data-vivarcdi-tile-minus\]/.test(css), false);
  assert.match(css, /\[data-vivarcdi-tile\]:hover \[data-vivarcdi-tile-minus\][^{]*\{[^}]*pointer-events: auto/);
});

test('keeps the minus off a Favorite tile', () => {
  const css = compiled();
  assert.equal(/\[data-vivarcdi-favorite\][^{]*\[data-vivarcdi-tile-minus\]/.test(css), false);
});
