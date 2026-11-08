import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Palettes } from '../../../src/modules/sidebarlook/Palettes.js';

const READABLE = 4.5;

test('palettes keep readable text', () => {
  assert.equal(Palettes.all.length, 7);
  for (const { name, space, pill, ink } of Palettes.all) {
    assert.ok(Palettes.contrast(ink, space) >= READABLE, `${name}: text on the space color`);
    assert.ok(Palettes.contrast(ink, pill) >= READABLE, `${name}: text on the active pill`);
  }
});

test('arclight palette keeps readable text', () => {
  const { ink, pill, gradient } = Palettes.byName('arclight');
  assert.equal(ink, '#212121');
  assert.deepEqual(gradient?.stops, ['#f3b8ac', '#d0c9c5', '#8ae3f2']);
  for (const stop of gradient?.stops ?? []) {
    assert.ok(Palettes.contrast(ink, stop) >= READABLE, `text on ${stop}`);
  }
  assert.equal(pill, '#ffffff');
  assert.ok(Palettes.contrast(ink, pill) >= READABLE, 'text on the pill');
});

test('the gradient is written as a CSS linear gradient', () => {
  assert.equal(Palettes.css({ angle: 135, stops: ['#111111', '#222222'] }), 'linear-gradient(135deg, #111111, #222222)');
});

test('the contrast of black on white is 21 and of a color with itself is 1', () => {
  assert.equal(Palettes.contrast('#000000', '#ffffff'), 21);
  assert.equal(Palettes.contrast('#a3cee0', '#a3cee0'), 1);
  assert.equal(Palettes.contrast('#ffffff', '#000000'), 21);
});

test('the palettes are arclight and the six blues, and arclight is the default', () => {
  assert.deepEqual(Palettes.all.map(({ name }) => name), ['arclight', 'sky', 'ice', 'powder', 'aqua', 'mist', 'lagoon']);
  assert.deepEqual(Palettes.byName('sky'), { name: 'sky', space: '#a3cee0', pill: '#e9f3f7', ink: '#0f2129' });
  assert.equal(Palettes.byName(Palettes.defaultName).name, 'arclight');
});

test('an unknown palette name gives the default palette', () => {
  assert.equal(Palettes.byName('neon').name, 'arclight');
  assert.equal(Palettes.byName(undefined).name, 'arclight');
  assert.equal(Palettes.byName('lagoon').space, '#8ec5cf');
});
