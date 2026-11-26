import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import * as sass from 'sass';

const STYLES = fileURLToPath(new URL('../../src/styles/', import.meta.url));
const compiled = (): string => sass.compile(`${STYLES}today.scss`).css;

test('draws the Clear bar on the separator above the Today tabs', () => {
  const css = compiled();
  assert.match(css, /\[data-vivarcdi-clear-row\]\s*\{[^}]*position: absolute/);
  assert.match(css, /\[data-vivarcdi-clear-row\]\s*\{[^}]*height: 0/);
  assert.match(css, /\[data-vivarcdi-clear-row\]\s*\{[^}]*translateY\(calc\(var\(--PositionY\) - var\(--vivarcdi-gap-shift, 0px\) \+ [^)]+\)\)/);
  assert.match(css, /\[data-vivarcdi-clear-row\]::before\s*\{[^}]*border-top: 1px solid var\(--vivarcdi-line\)/);
  assert.match(css, /\[data-vivarcdi-clear-row\]\[data-vivarcdi-clear-line\]::before/);
  assert.match(css, /\[data-vivarcdi-clear-row\] \[data-vivarcdi-clear\]\s*\{[^}]*height: 13px/);
  assert.match(css, /\[data-vivarcdi-clear\]::before\s*\{[^}]*content: "↓"/);
  const button = /\[data-vivarcdi-clear-row\] \[data-vivarcdi-clear\]\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.doesNotMatch(button, /border-top/);
});

test('hides the Clear label outside the sidebar', () => {
  const css = compiled();
  const row = /\[data-vivarcdi-clear-row\] \{([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.match(row, /display: flex;/);
  const line = /\[data-vivarcdi-clear-row\]::before \{([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.match(line, /flex: 1 1 auto;/);
  assert.doesNotMatch(line, /inset-inline/);
  assert.doesNotMatch(line, /position: absolute/);
  assert.doesNotMatch(line, /margin/);
  const button = /\[data-vivarcdi-clear-row\] \[data-vivarcdi-clear\] \{([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.match(button, /max-width: 0;/);
  assert.match(button, /margin-inline-start: 0;/);
  assert.match(button, /opacity: 0;/);
  assert.match(button, /pointer-events: none;/);
  assert.match(button, /position: static;/);
  assert.match(button, /flex: none;/);
  assert.doesNotMatch(button, /inset-inline/);
});

test('shows the muted Clear label while the pointer is in the sidebar', () => {
  const css = compiled();
  const open = /#browser\[data-vivarcdi-active\] :is\(#tabs-tabbar-container:is\(\.left, \.right\):hover, \[data-vivarcdi-clear-row\]:focus-within\) \[data-vivarcdi-clear\] \{([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.match(open, /opacity: 1;/);
  assert.match(open, /max-width: [1-9]\d*px;/);
  assert.match(open, /margin-inline-start: 10px;/);
  assert.match(open, /pointer-events: auto;/);
  const button = /\[data-vivarcdi-clear-row\] \[data-vivarcdi-clear\] \{([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.match(button, /color: var\(--vivarcdi-muted/);
  assert.match(button, /font-weight: 600;/);
  assert.match(button, /font-size: 11px;/);
  assert.match(button, /transition: max-width var\(--vivarcdi-transition\), margin-inline-start var\(--vivarcdi-transition\), opacity var\(--vivarcdi-transition\), color var\(--vivarcdi-transition\);/);
});

test('strengthens the Clear label when pointed at', () => {
  const css = compiled();
  const hover = /\[data-vivarcdi-clear-row\] \[data-vivarcdi-clear\]:hover, [^{]*:focus-visible \{([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.match(hover, /color: var\(--vivarcdi-ink/);
  assert.doesNotMatch(hover, /opacity/);
});

test('aligns the Clear line with the row icons', () => {
  const css = compiled();
  const tokens = readFileSync(`${STYLES}_tokens.scss`, 'utf8');
  assert.match(tokens, /\$clear-line-start: \$folders-padding;/);
  assert.match(tokens, /\$clear-line-end: \$folders-padding \* 2;/);
  const row = /\[data-vivarcdi-clear-row\] \{([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.match(row, /inset-inline: 6px 12px;/);
  const source = readFileSync(`${STYLES}today.scss`, 'utf8');
  assert.match(source, /inset-inline: \$clear-line-start \$clear-line-end;/);
  assert.doesNotMatch(source, /inset-inline: \$folders-padding/);
});

test('puts the Clear line below a native pinned group when the Favorites grid is off', () => {
  const css = compiled();
  const rule = /\.pinned-group \.tab-position\.is-pinned\):not\(:has\(\[data-vivarcdi-tiles\]\)\) \[data-vivarcdi-clear-row\] \{([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.match(rule, /translateY\(calc\(var\(--PositionY\) - var\(--vivarcdi-gap-shift, 0px\) \+ 4px\)\)/);
  const tokens = readFileSync(`${STYLES}_tokens.scss`, 'utf8');
  assert.match(tokens, /\$clear-line-offset-pinned: 4px;/);
});
