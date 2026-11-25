import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const STYLES = fileURLToPath(new URL('../../src/styles/', import.meta.url));
const css = (): string => sass.compile(`${STYLES}folders.scss`).css;

test('draws the folder and link minus as the same badge', () => {
  const tokens = readFileSync(`${STYLES}_tokens.scss`, 'utf8');
  const source = readFileSync(`${STYLES}folders.scss`, 'utf8');
  assert.match(tokens, /\$minus-badge-size: 21px/);
  assert.match(tokens, /\$minus-badge-radius: 5px/);
  assert.ok(source.includes('@use \'minus\''));
  assert.ok(source.includes('@include minus-badge'));
  const badge = /\[data-vivarcdi-folders\][^{]*\.vivarcdi-folders-minus \{([^}]*)\}/.exec(css())?.[1] ?? '';
  assert.match(badge, /width: 21px;/);
  assert.match(badge, /border-radius: 5px;/);
  assert.match(badge, /background-color: color-mix\(/);
  assert.equal(/\[data-vivarcdi-link-close\]/.test(css()), false);
  assert.equal(css().includes('\\00d7'), false);
});

test('shows the folder and link minus on hover or on the current link', () => {
  const cssText = css();
  assert.match(cssText, /\[data-vivarcdi-link-open\]:hover \[data-vivarcdi-link-minus\][^{]*\{[^}]*opacity: 1/);
  assert.match(cssText, /\[data-vivarcdi-link-active\] \[data-vivarcdi-link-minus\]/);
  assert.match(cssText, /\[data-vivarcdi-folder-unload\]:hover \[data-vivarcdi-folder-minus\]/);
});
