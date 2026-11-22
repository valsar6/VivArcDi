import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LabelIcon } from '../../../src/shared/icons/LabelIcon.js';
import { IconSymbols } from '../../../src/shared/icons/IconSymbols.js';
import { asDocument } from '../../core/dom.js';
import { SvgDocument } from './fakes.js';

const CLASS = 'row-icon';

test('draws an emoji as the text of a span', () => {
  const icon = LabelIcon.create(asDocument(new SvgDocument()), { emoji: '📧' }, CLASS) as unknown as { tagName: string; className: string; textContent: string };
  assert.deepEqual([icon.tagName, icon.className, icon.textContent], ['SPAN', CLASS, '📧']);
});

test('draws a symbol as an inline svg that takes the color of the row', () => {
  const heart = IconSymbols.byId('heart');
  const icon = LabelIcon.create(asDocument(new SvgDocument()), { symbol: 'heart' }, CLASS) as unknown as { tagName: string; className: string; children: Array<{ tagName: string; attributes: Map<string, string>; children: Array<{ attributes: Map<string, string> }> }> };
  assert.deepEqual([icon.tagName, icon.className], ['SPAN', CLASS]);
  const svg = icon.children[0];
  assert.equal(svg?.tagName, 'SVG');
  assert.deepEqual(
    ['viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap'].map((name) => svg?.attributes.get(name)),
    ['0 0 24 24', 'none', 'currentColor', '1.8', 'round'],
  );
  assert.equal(svg?.children[0]?.attributes.get('d'), heart?.path);
});

test('draws nothing for a symbol that is not known', () => {
  assert.equal(LabelIcon.create(asDocument(new SvgDocument()), { symbol: 'nothing' }, CLASS), null);
});
