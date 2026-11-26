import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const STYLES = fileURLToPath(new URL('../../src/styles/', import.meta.url));
const read = (name: string): string => readFileSync(`${STYLES}${name}`, 'utf8');
const compiled = (name: string): string => sass.compile(`${STYLES}${name}`).css;
const ruleBody = (css: string, selector: RegExp): string => selector.exec(css)?.[1] ?? '';

const SURFACES: Array<[string, RegExp]> = [
  ['pinned.scss', /\.tab-position\.is-pinned \[data-vivarcdi-pinned-minus\] \{([^}]*)\}/],
  ['favorites.scss', /\[data-vivarcdi-tile-source=pinned\][^{]*\[data-vivarcdi-tile-minus\] \{([^}]*)\}/],
  ['folders.scss', /\[data-vivarcdi-folders\][^{]*\.vivarcdi-folders-minus \{([^}]*)\}/],
];

test('draws the minus badge at twenty-four pixels', () => {
  const tokens = read('_tokens.scss');
  assert.match(tokens, /\$minus-badge-size: 24px;/);
  assert.match(tokens, /\$minus-badge-radius: 5px;/);
  assert.match(tokens, /\$minus-offset: 6px;/);
  assert.match(tokens, /\$minus-glyph: url\("data:image\/svg\+xml[^"]*M1 7h14v2H1z/);
  for (const [name, selector] of SURFACES) {
    const badge = ruleBody(compiled(name), selector);
    assert.match(badge, /width: 24px;/, name);
    assert.match(badge, /height: 24px;/, name);
    assert.match(badge, /border-radius: 5px;/, name);
    assert.match(badge, /inset-inline-end: 6px;/, name);
  }
});

test('gives the title the hidden minus space at rest', () => {
  const rows = compiled('sidebar-look.scss');
  const rowHover = /\.tab-wrapper:hover \.title \{([^}]*)\}/.exec(rows)?.[1] ?? '';
  assert.match(rowHover, /padding-inline-end: 30px;/);
  const folders = compiled('folders.scss');
  assert.match(folders, /\[data-vivarcdi-folders\][^{]*\[data-vivarcdi-folder-unload\]:hover \.vivarcdi-folders-title[^{]*\{[^}]*padding-inline-end: 30px;/);
  assert.match(folders, /\[data-vivarcdi-folders\][^{]*\[data-vivarcdi-link-open\]:hover \.vivarcdi-folders-title[^{]*\{[^}]*padding-inline-end: 30px;/);
});

test('keeps the close and minus gestures', () => {
  const css = compiled('sidebar-look.scss');
  assert.match(/\.tab-wrapper \.close \{[^}]*pointer-events: none/.exec(css)?.[0] ?? '', /pointer-events: none/);
  assert.match(/\.tab-wrapper:hover \.close \{[^}]*pointer-events: auto/.exec(css)?.[0] ?? '', /pointer-events: auto/);
  assert.match(compiled('pinned.scss'), /\.tab-position\.is-pinned:hover \[data-vivarcdi-pinned-minus\][^{]*\{[^}]*pointer-events: auto/);
  assert.match(compiled('favorites.scss'), /\[data-vivarcdi-tile\]:hover \[data-vivarcdi-tile-minus\][^{]*\{[^}]*pointer-events: auto/);
  assert.match(compiled('folders.scss'), /\[data-vivarcdi-link-open\]:hover \[data-vivarcdi-link-minus\][^{]*\{[^}]*pointer-events: auto/);
  assert.match(compiled('folders.scss'), /\[data-vivarcdi-folder-unload\]:hover \[data-vivarcdi-folder-minus\][^{]*\{[^}]*pointer-events: auto/);
});
