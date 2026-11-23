import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const STYLES = fileURLToPath(new URL('../../src/styles/', import.meta.url));
const compiled = (): string => sass.compile(`${STYLES}today.scss`).css;

test('draws the Clear bar on the pinned separator', () => {
  const css = compiled();
  assert.match(css, /\[data-vivarcdi-pinned-last\] \[data-vivarcdi-clear\][\s\S]*?border-top: 1px solid var\(--vivarcdi-line\)/);
  assert.match(css, /\[data-vivarcdi-clear\]::before[^{]*\{[^}]*content: "↓"/);
});
