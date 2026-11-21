import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const STYLES = fileURLToPath(new URL('../../src/styles/', import.meta.url));
const MIN_CONTRAST = 4.5;
const PRIMARY = 'button[data-vivarcdi-connect-primary]';

type Rgb = [number, number, number];
type Theme = Record<string, string>;

const THEMES: Array<[string, Theme]> = [
  ['without theme variables', {}],
  ['light theme', { '--colorHighlightBg': '#0066ff', '--colorHighlightFg': '#ffffff' }],
  ['dark theme with a light accent', { '--colorHighlightBg': '#ffffff', '--colorHighlightFg': '#1a1a1a' }],
  ['dark theme with a pale accent', { '--colorHighlightBg': '#f2c9ff', '--colorHighlightFg': '#2b0a33' }],
  ['dark theme with a deep accent', { '--colorHighlightBg': '#7a1f4a', '--colorHighlightFg': '#ffffff' }],
];

function rule(css: string, selector: string, property: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = new RegExp(`\\[data-vivarcdi-connect-panel\\] ${escaped}\\s*\\{([^}]*)\\}`).exec(css);
  const value = new RegExp(`(?:^|[\\s;{])${property}:\\s*([^;]+);`).exec(block?.[1] ?? '');
  assert.ok(value?.[1], `${selector} sets ${property}`);
  return value[1];
}

function splitArguments(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    depth += character === '(' ? 1 : character === ')' ? -1 : 0;
    if (character === ',' && depth === 0) {
      parts.push(text.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(text.slice(start).trim());
  return parts;
}

function hex(color: string): Rgb {
  const digits = color.slice(1);
  const full = digits.length === 3 ? [...digits].map((digit) => digit + digit).join('') : digits;
  return [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16)) as Rgb;
}

function mixed(arguments_: string, theme: Theme): Rgb {
  const [space, first = '', second = ''] = splitArguments(arguments_);
  assert.equal(space, 'in srgb');
  const [firstColor = '', firstShare = '50%'] = first.split(/\s+(?=\d+(?:\.\d+)?%$)/);
  const share = parseFloat(firstShare) / 100;
  const a = resolve(firstColor, theme);
  const b = resolve(second, theme);
  return a.map((channel, index) => channel * share + (b[index] ?? 0) * (1 - share)) as Rgb;
}

function variable(arguments_: string, theme: Theme): Rgb {
  const [name = '', fallback = ''] = splitArguments(arguments_);
  return resolve(theme[name] ?? fallback, theme);
}

function resolve(value: string, theme: Theme): Rgb {
  const text = value.trim();
  const call = /^(var|color-mix)\((.*)\)$/.exec(text);
  if (text.startsWith('#') || text === 'black') {
    return hex(text === 'black' ? '#000000' : text);
  }
  assert.ok(call?.[2], `cannot resolve ${text}`);
  return call[1] === 'var' ? variable(call[2], theme) : mixed(call[2], theme);
}

function luminance(color: Rgb): number {
  const [red = 0, green = 0, blue = 0] = color.map((channel) => {
    const unit = channel / 255;
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: Rgb, second: Rgb): number {
  const [light = 0, dark = 0] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

test('keeps the main button label readable on light and dark themes', () => {
  const css = sass.compile(`${STYLES}live-folders.scss`).css;
  const label = rule(css, PRIMARY, 'color');
  const states: Array<[string, string]> = [
    ['at rest', rule(css, PRIMARY, 'background-color')],
    ['on hover', rule(css, `${PRIMARY}:hover`, 'background-color')],
  ];
  for (const [themeName, theme] of THEMES) {
    for (const [state, background] of states) {
      const ratio = contrast(resolve(label, theme), resolve(background, theme));
      assert.ok(ratio >= MIN_CONTRAST, `${themeName}, ${state}: contrast ${ratio.toFixed(2)}:1 is under ${MIN_CONTRAST}:1`);
    }
  }
});
