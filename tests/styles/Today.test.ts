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

test('insets the Clear line like the rows', () => {
  const css = compiled();
  const row = /\[data-vivarcdi-clear-row\] \{([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.match(row, /inset-inline: 6px;/);
  assert.match(row, /display: flex;/);
  const line = /\[data-vivarcdi-clear-row\]::before \{([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.doesNotMatch(line, /inset-inline/);
  assert.doesNotMatch(line, /position: absolute/);
  const button = /\[data-vivarcdi-clear-row\] \[data-vivarcdi-clear\] \{([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.doesNotMatch(button, /inset-inline/);
  assert.doesNotMatch(button, /justify-content/);
});

test('shows the Clear label at rest', () => {
  const css = compiled();
  const button = /\[data-vivarcdi-clear-row\] \[data-vivarcdi-clear\] \{([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.doesNotMatch(button, /opacity: 0;/);
  assert.match(button, /opacity: 1;/);
  assert.match(button, /color: var\(--vivarcdi-muted/);
  assert.match(button, /font-weight: 600;/);
  assert.match(button, /font-size: 11px;/);
});

test('ends the Clear line before its label', () => {
  const css = compiled();
  const row = /\[data-vivarcdi-clear-row\] \{([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.match(row, /display: flex;/);
  assert.match(row, /align-items: center;/);
  const line = /\[data-vivarcdi-clear-row\]::before \{([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.match(line, /flex: 1 1 auto;/);
  assert.match(line, /height: 0;/);
  assert.match(line, /border-top: 1px solid var\(--vivarcdi-line\);/);
  const button = /\[data-vivarcdi-clear-row\] \[data-vivarcdi-clear\] \{([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.match(button, /position: static;/);
  assert.match(button, /flex: none;/);
  assert.match(button, /margin-inline-start: 8px;/);
  assert.doesNotMatch(button, /inset-inline/);
});

test('strengthens the Clear label on hover', () => {
  const css = compiled();
  const hover = /\[data-vivarcdi-clear-row\] \[data-vivarcdi-clear\]:hover, [^{]*:focus-visible \{([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.match(hover, /color: var\(--vivarcdi-ink/);
  assert.doesNotMatch(hover, /opacity/);
});
