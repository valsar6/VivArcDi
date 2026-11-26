import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';
import { Palettes } from '../../src/modules/sidebarlook/Palettes.js';

const STYLES = fileURLToPath(new URL('../../src/styles/', import.meta.url));
const read = (name: string): string => readFileSync(`${STYLES}${name}`, 'utf8');
const shortHex = (color: string): string => color.replace(/^#(\w)\1(\w)\2(\w)\3$/, '#$1$2$3');
const compiled = (): string => sass.compile(`${STYLES}sidebar-look.scss`).css;
const ruleBody = (css: string, selector: RegExp): string => selector.exec(css)?.[1] ?? '';

const TOKENS: Array<[string, string]> = [
  ['$row-height', '36px'],
  ['$row-gap', '2px'],
  ['$row-radius', '8px'],
  ['$veil', '22%'],
  ['$hover-veil', '35%'],
  ['$scrollbar-width', '6px'],
  ['$pill-shadow', '0 1px 2px rgb(0 0 0 / 12%)'],
];

test('sidebar look uses tokens', () => {
  const tokens = read('_tokens.scss');
  const source = read('sidebar-look.scss');
  const css = compiled();
  for (const [name, value] of TOKENS) {
    assert.ok(tokens.includes(`${name}: ${value};`), `${name} is defined as ${value}`);
    assert.ok(source.includes(name), `${name} is used`);
    assert.equal(source.includes(value), false, `${value} is not repeated in the stylesheet`);
  }
  assert.match(css, /height: 36px/);
  assert.match(css, /margin-bottom: 2px/);
  assert.match(css, /border-radius: 8px/);
  assert.match(css, /white 22%/);
  assert.match(css, /white 35%/);
  assert.match(css, /width: 6px/);
});

test('sidebar look rules all sit under the look mark', () => {
  const selectors = [...compiled().matchAll(/^([^\s@}][^{]*)\{/gm)].flatMap(([, list]) => (list ?? '').split(/,\n/));
  assert.ok(selectors.length > 0);
  for (const selector of selectors) {
    assert.ok(selector.trim().startsWith('#browser[data-vivarcdi-look]'), selector);
  }
});

test('the stylesheet falls back to the arclight palette', () => {
  const arclight = Palettes.byName('arclight');
  const css = compiled();
  assert.ok(css.includes(`--vivarcdi-space: var(--vivarcdi-space-theme, ${arclight.space})`));
  assert.ok(css.includes(`--vivarcdi-pill: var(--vivarcdi-pill-theme, ${shortHex(arclight.pill)})`));
  assert.ok(css.includes(`--vivarcdi-ink: var(--vivarcdi-ink-theme, ${arclight.ink})`));
});

test('a gradient paints the browser and clears the tab bar background', () => {
  const css = compiled();
  assert.match(css, /#browser\[data-vivarcdi-look\]\[data-vivarcdi-gradient\] \{\s*background: var\(--vivarcdi-gradient\) !important;/);
  assert.match(css, /\[data-vivarcdi-gradient\] #tabs-tabbar-container:is\(\.left, \.right\)[^{]*\{\s*background-color: transparent !important;/);
});

test('the gradient shows behind the panel bar', () => {
  assert.match(compiled(), /\[data-vivarcdi-gradient\] #switch\s*\{\s*background-color: transparent !important;/);
});

test('hides the flexible spacer of the tab bar', () => {
  assert.match(compiled(), /\.button-toolbar\.toolbar-spacer-flexible\)\s*\{\s*display: none !important;/);
});

test('tile icons are 20 px', () => {
  const css = sass.compile(`${STYLES}favorites.scss`).css;
  assert.match(css, /\[data-vivarcdi-tile\] > img \{\s*width: 20px;\s*height: 20px;/);
});

test('hides the tab bar buttons that only hold spacers', () => {
  assert.match(compiled(), /\.tabbar-nested-buttons:not\(:has\(\.button-toolbar:not\(\.toolbar-spacer, \.toolbar-spacer-flexible\)\)\)\s*\{\s*display: none !important;/);
});

test('the space name and the rows below keep the row spacing', () => {
  const css = compiled();
  assert.match(css, /\[data-vivarcdi-space-header\] \{[^}]*margin-block: 0 2px;/);
  assert.match(css, /\[data-vivarcdi-folders\] \{[^}]*padding-block: 0;/);
});

test('the bars revealed by Automatically hide UI keep the space color over the page', () => {
  const css = compiled();
  assert.match(css, /#browser\[data-vivarcdi-look\]\.auto-hide \.auto-hide-wrapper\s*\{\s*background-color: var\(--vivarcdi-space\) !important;/);
});

test('draws the open tab close as an Arc X', () => {
  const tokens = read('_tokens.scss');
  const css = compiled();
  assert.match(tokens, /\$close-glyph: url\("data:image\/svg\+xml[^"]*viewBox='0 0 12 12'/);
  assert.match(tokens, /\$close-glyph-size: 12px;/);
  const base = ruleBody(css, /\.tab-wrapper \.close \{([^}]*)\}/);
  assert.match(base, /position: relative !important/);
  assert.match(base, /flex: none/);
  assert.match(base, /width: 0;/);
  assert.match(base, /height: 24px;/);
  assert.match(base, /overflow: hidden/);
  assert.match(base, /opacity: 0;/);
  assert.match(base, /pointer-events: none/);
  const glyph = ruleBody(css, /\.tab-wrapper \.close::before \{([^}]*)\}/);
  assert.match(glyph, /width: 12px;/);
  assert.match(glyph, /height: 12px;/);
  assert.match(glyph, /mask: url\("data:image\/svg\+xml/);
  const hover = ruleBody(css, /\.tab-wrapper:hover \.close \{([^}]*)\}/);
  assert.match(hover, /width: 24px;/);
  assert.match(hover, /margin-inline-end: 6px;/);
  assert.match(hover, /opacity: 1;/);
  assert.match(hover, /pointer-events: auto/);
});

test('shows the Arc close badge only on button hover', () => {
  const css = compiled();
  const base = ruleBody(css, /\.tab-wrapper \.close \{([^}]*)\}/);
  assert.equal(/background-color:/.test(base), false);
  assert.match(base, /border-radius: 5px;/);
  const rowHover = ruleBody(css, /\.tab-wrapper:hover \.close \{([^}]*)\}/);
  assert.equal(/background-color:/.test(rowHover), false);
  const badge = ruleBody(css, /\.tab-wrapper \.close:hover \{([^}]*)\}/);
  assert.match(badge, /background-color: color-mix\(/);
  const glyph = ruleBody(css, /\.tab-wrapper \.close:hover::before \{([^}]*)\}/);
  assert.match(glyph, /background-color: color-mix\(/);
});

test('gives the title the hidden close space at rest', () => {
  const css = compiled();
  const base = ruleBody(css, /\.tab-wrapper \.title \{([^}]*)\}/);
  assert.match(base, /min-width: 0;/);
  assert.match(base, /overflow: hidden;/);
  assert.match(base, /text-overflow: ellipsis;/);
  assert.match(base, /white-space: nowrap;/);
  assert.match(base, /padding-inline-end: 0;/);
  const hover = ruleBody(css, /\.tab-wrapper:hover \.title \{([^}]*)\}/);
  assert.match(hover, /padding-inline-end: 30px;/);
});
