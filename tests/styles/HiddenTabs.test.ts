import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const STYLES = fileURLToPath(new URL('../../src/styles/', import.meta.url));
const compiled = (): string => sass.compile(`${STYLES}hidden-tabs.scss`).css;

test('hidden tabs stylesheet subtracts the gap shift from the offset of a slot', () => {
  assert.match(compiled(), /translateY\(calc\(var\(--PositionY\) - var\(--vivarcdi-gap-shift, 0px\)\)\)/);
});

test('hidden tabs stylesheet keeps the horizontal offset of a slot', () => {
  assert.match(compiled(), /translateX\(var\(--PositionX\)\)/);
});

test('hidden tabs stylesheet rules all sit under the look mark', () => {
  const selectors = [...compiled().matchAll(/^([^{}\n]+)\{/gm)].map((match) => match[1] ?? '');
  assert.ok(selectors.length > 0);
  selectors.forEach((selector) => assert.ok(selector.startsWith('#browser[data-vivarcdi-active]'), selector));
});
