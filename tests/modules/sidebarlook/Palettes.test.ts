import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Palettes } from '../../../src/modules/sidebarlook/Palettes.js';

const READABLE = 4.5;

test('palettes keep readable text', () => {
  assert.equal(Palettes.all.length, 6);
  for (const { name, space, pill, ink } of Palettes.all) {
    assert.ok(Palettes.contrast(ink, space) >= READABLE, `${name}: text on the space color`);
    assert.ok(Palettes.contrast(ink, pill) >= READABLE, `${name}: text on the active pill`);
  }
});

test('the contrast of black on white is 21 and of a color with itself is 1', () => {
  assert.equal(Palettes.contrast('#000000', '#ffffff'), 21);
  assert.equal(Palettes.contrast('#a3cee0', '#a3cee0'), 1);
  assert.equal(Palettes.contrast('#ffffff', '#000000'), 21);
});

test('the palettes are the six of the spec and sky is the default', () => {
  assert.deepEqual(Palettes.all.map(({ name }) => name), ['sky', 'ice', 'powder', 'aqua', 'mist', 'lagoon']);
  assert.deepEqual(Palettes.byName('sky'), { name: 'sky', space: '#a3cee0', pill: '#e9f3f7', ink: '#0f2129' });
  assert.equal(Palettes.byName(Palettes.defaultName).name, 'sky');
});

test('an unknown palette name gives the default palette', () => {
  assert.equal(Palettes.byName('neon').name, 'sky');
  assert.equal(Palettes.byName(undefined).name, 'sky');
  assert.equal(Palettes.byName('lagoon').space, '#8ec5cf');
});
