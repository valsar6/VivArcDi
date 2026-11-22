import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const STYLES = fileURLToPath(new URL('../../src/styles/', import.meta.url));
const read = (name: string): string => readFileSync(`${STYLES}${name}`, 'utf8');
const compiled = (): string => sass.compile(`${STYLES}icon-picker.scss`).css;

const MARKS = [
  'data-vivarcdi-picker-header',
  'data-vivarcdi-picker-pane',
  'data-vivarcdi-picker-body',
  'data-vivarcdi-picker-grid',
  'data-vivarcdi-picker-bar',
];

test('the picker styles its own marks instead of the position of its children', () => {
  const css = compiled();
  for (const mark of MARKS) {
    assert.ok(css.includes(`[${mark}]`) || css.includes(`[${mark}=`), `${mark} is targeted`);
  }
  assert.equal(css.includes(':first-child'), false);
  assert.equal(css.includes(':last-child'), false);
  assert.equal(css.includes(':nth-child'), false);
});

test('the emoji grid has eight columns and the icons grid six', () => {
  const tokens = read('_tokens.scss');
  const source = read('icon-picker.scss');
  assert.ok(tokens.includes('$picker-emoji-columns: 8;'));
  assert.ok(tokens.includes('$picker-icon-columns: 6;'));
  assert.ok(source.includes('$picker-emoji-columns'));
  assert.ok(source.includes('$picker-icon-columns'));
  assert.match(compiled(), /grid-template-columns: repeat\(8, 32px\)/);
  assert.match(compiled(), /grid-template-columns: repeat\(6, 32px\)/);
});

test('the picker rules all sit under the active browser mark', () => {
  const selectors = [...compiled().matchAll(/^([^\s@}][^{]*)\{/gm)].flatMap(([, list]) => (list ?? '').split(/,\n/));
  assert.ok(selectors.length > 0);
  for (const selector of selectors) {
    assert.ok(selector.trim().startsWith('#browser[data-vivarcdi-active]'), selector);
  }
});
