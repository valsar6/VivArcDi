import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const STYLES = fileURLToPath(new URL('../../src/styles/', import.meta.url));
const read = (name: string): string => readFileSync(`${STYLES}${name}`, 'utf8');
const compiled = (): string => sass.compile(`${STYLES}pinned.scss`).css;
const compiledTiles = (): string => sass.compile(`${STYLES}favorites.scss`).css;

const ROW = '#browser\\[data-vivarcdi-active\\]\\[data-vivarcdi-pinned-unload\\] \\.tab-position\\.is-pinned';
const MINUS = '\\[data-vivarcdi-pinned-minus\\]';
const TILE_SOURCE = '\\[data-vivarcdi-tiles\\]\\[data-vivarcdi-tile-source=pinned\\]';
const TILE_MINUS = '\\[data-vivarcdi-tile-minus\\]';
const ruleBody = (css: string, selector: RegExp): string => selector.exec(css)?.[1] ?? '';

test('draws the pinned row minus as a badge like Arc', () => {
  const tokens = read('_tokens.scss');
  const css = compiled();
  assert.match(tokens, /\$minus-glyph: url\("data:image\/svg\+xml/);
  assert.match(tokens, /\$minus-badge-size: 24px/);
  assert.match(tokens, /\$minus-badge-radius: 5px/);
  assert.match(tokens, /\$minus-size: 16px/);
  const base = new RegExp(`${ROW} ${MINUS} \\{([^}]*)\\}`).exec(css)?.[1] ?? '';
  assert.match(base, /width: 24px;/);
  assert.match(base, /height: 24px;/);
  assert.match(base, /border-radius: 5px;/);
  assert.equal(/background-color:/.test(base), false);
  assert.match(base, /opacity: 0;/);
  assert.match(base, /pointer-events: none/);
  assert.equal(/mask:/.test(base), false);
  const dash = new RegExp(`${ROW} ${MINUS}::before \\{([^}]*)\\}`).exec(css)?.[1] ?? '';
  assert.match(dash, /width: 16px;/);
  assert.match(dash, /mask: url\("data:image\/svg\+xml/);
  assert.match(css, /\.tab-position\.is-pinned \.tab-header \.close[^{]*\{[^}]*display: none/);
  assert.equal(css.includes('data-vivarcdi-tile'), false);
});

test('shows the pinned row minus only while the row is hovered', () => {
  const css = compiled();
  assert.match(css, /\.tab-position\.is-pinned:hover \[data-vivarcdi-pinned-minus\][^{]*\{[^}]*opacity: 1/);
  assert.equal(css.includes(':has('), false);
});

test('shows the pinned minus badge only while the button is hovered', () => {
  const css = compiled();
  const hover = ruleBody(css, new RegExp(`${ROW} ${MINUS}:hover \\{([^}]*)\\}`));
  assert.match(hover, /background-color: color-mix\(/);
  const dash = ruleBody(css, new RegExp(`${ROW} ${MINUS}:hover::before \\{([^}]*)\\}`));
  assert.match(dash, /background-color: color-mix\(/);
  const tiles = compiledTiles();
  const tileHover = ruleBody(tiles, new RegExp(`${TILE_SOURCE}[^{]*${TILE_MINUS}:hover \\{([^}]*)\\}`));
  assert.match(tileHover, /background-color: color-mix\(/);
  const tileDash = ruleBody(tiles, new RegExp(`${TILE_SOURCE}[^{]*${TILE_MINUS}:hover::before \\{([^}]*)\\}`));
  assert.match(tileDash, /background-color: color-mix\(/);
});
