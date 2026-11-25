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
  assert.equal(/background-color:/.test(badge), false);
  assert.equal(/\[data-vivarcdi-link-close\]/.test(css()), false);
  assert.equal(css().includes('\\00d7'), false);
});

test('shows the link row minus only while the row is hovered', () => {
  const cssText = css();
  assert.match(cssText, /\[data-vivarcdi-link-open\]:hover \[data-vivarcdi-link-minus\][^{]*\{[^}]*opacity: 1/);
  assert.equal(/\[data-vivarcdi-link-active\] \[data-vivarcdi-link-minus\]/.test(cssText), false);
});

test('shows the folder row minus only while the row is hovered', () => {
  assert.match(css(), /\[data-vivarcdi-folder-unload\]:hover \[data-vivarcdi-folder-minus\][^{]*\{[^}]*opacity: 1/);
});

test('shows the folder and link minus badges only while the buttons are hovered', () => {
  const cssText = css();
  const badge = /\[data-vivarcdi-folders\][^{]*\.vivarcdi-folders-minus:hover \{([^}]*)\}/.exec(cssText)?.[1] ?? '';
  assert.match(badge, /background-color: color-mix\(/);
  const dash = /\[data-vivarcdi-folders\][^{]*\.vivarcdi-folders-minus:hover::before \{([^}]*)\}/.exec(cssText)?.[1] ?? '';
  assert.match(dash, /background-color: color-mix\(/);
});

test('removes the dot from an open link row', () => {
  const tokens = readFileSync(`${STYLES}_tokens.scss`, 'utf8');
  assert.equal(/::after/.test(css()), false);
  assert.equal(tokens.includes('$folders-dot-size'), false);
});
