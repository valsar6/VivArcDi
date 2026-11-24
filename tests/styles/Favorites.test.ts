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

test('draws the tile minus only on hover and on the current tile', () => {
  const tokens = read('_tokens.scss');
  const source = read('favorites.scss');
  const css = compiled();
  assert.match(tokens, /\$tile-minus: '\[data-vivarcdi-tile-minus\]'/);
  assert.ok(source.includes('$minus-glyph'), '$minus-glyph is used');
  assert.ok(source.includes('$minus-size'), '$minus-size is used');
  assert.ok(source.includes('$minus-offset'), '$minus-offset is used');
  const base = new RegExp(`${SOURCE}[^{]*${MINUS}[^{]*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
  assert.match(base, /opacity: 0;/);
  assert.match(base, /pointer-events: none/);
  assert.match(base, /mask: url\("data:image\/svg\+xml/);
  assert.match(css, /\[data-vivarcdi-tile\]:hover \[data-vivarcdi-tile-minus\][^{]*\{[^}]*opacity: 1/);
  assert.match(css, /\[data-vivarcdi-tile\]\[data-vivarcdi-current\] \[data-vivarcdi-tile-minus\][^{]*\{[^}]*opacity: 1/);
  assert.match(css, /\[data-vivarcdi-tile\]:hover \[data-vivarcdi-tile-minus\][^{]*\{[^}]*pointer-events: auto/);
  assert.equal(/\[data-vivarcdi-favorite\][^{]*\[data-vivarcdi-tile-minus\]/.test(css), false);
});
