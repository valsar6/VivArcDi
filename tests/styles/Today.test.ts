import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const STYLES = fileURLToPath(new URL('../../src/styles/', import.meta.url));
const compiled = (): string => sass.compile(`${STYLES}today.scss`).css;

test('draws the Clear bar on the separator above the Today tabs', () => {
  const css = compiled();
  assert.match(css, /\[data-vivarcdi-clear-row\]\s*\{[^}]*position: absolute/);
  assert.match(css, /\[data-vivarcdi-clear-row\]\s*\{[^}]*height: 0/);
  assert.match(css, /\[data-vivarcdi-clear-row\]\s*\{[^}]*translateY\(calc\(var\(--PositionY\) - var\(--vivarcdi-gap-shift, 0px\)\)\)/);
  assert.match(css, /\[data-vivarcdi-clear-row\]::before\s*\{[^}]*border-top: 1px solid var\(--vivarcdi-line\)/);
  assert.match(css, /\[data-vivarcdi-clear-row\]\[data-vivarcdi-clear-line\]::before/);
  assert.match(css, /\[data-vivarcdi-clear-row\] \[data-vivarcdi-clear\]\s*\{[^}]*height: 13px/);
  assert.match(css, /\[data-vivarcdi-clear\]::before\s*\{[^}]*content: "↓"/);
  const button = /\[data-vivarcdi-clear-row\] \[data-vivarcdi-clear\]\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.doesNotMatch(button, /border-top/);
});
