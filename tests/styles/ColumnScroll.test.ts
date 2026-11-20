import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const STYLES = fileURLToPath(new URL('../../src/styles/', import.meta.url));
const compiled = (): string => sass.compile(`${STYLES}column-scroll.scss`).css;
const MARK = '#tabs-container[data-vivarcdi-column-scroll]';

function declarationsOf(css: string, selector: string): string {
  const rule = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].find(([, list]) => (list ?? '').split(',').some((item) => item.trim().endsWith(selector)));
  assert.ok(rule, `${selector} has a rule`);
  return rule[2] ?? '';
}

test('lets the folder section grow to its content', () => {
  const declarations = declarationsOf(compiled(), `${MARK} [data-vivarcdi-folders]`);
  assert.match(declarations, /max-height:\s*none/);
  assert.match(declarations, /overflow:\s*visible/);
});

test('keeps the tab strip frame at the height of its content', () => {
  const declarations = declarationsOf(compiled(), `${MARK} .resize:has(> .tab-strip)`);
  assert.match(declarations, /flex:\s*0 0 100000px !important/);
  assert.doesNotMatch(declarations, /max-height/);
});

test('reserves the height of the overflowing tabs under the tab strip frame', () => {
  const css = compiled();
  assert.match(declarationsOf(css, `${MARK} .resize:has(> .tab-strip)`), /margin-bottom:\s*var\(--vivarcdi-strip-overflow, 0px\)/);
  assert.match(declarationsOf(css, `${MARK} .tab-strip`), /overflow:\s*visible\s*!important/);
});

test('every column scroll rule applies only under the mark', () => {
  const selectors = [...compiled().matchAll(/^([^\s@}][^{]*)\{/gm)].flatMap(([, list]) => (list ?? '').split(/,\n/)).map((selector) => selector.trim());
  assert.ok(selectors.length > 0);
  for (const selector of selectors) {
    assert.ok(selector.includes(MARK), selector);
  }
});
