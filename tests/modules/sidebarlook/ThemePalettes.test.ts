import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Palettes } from '../../../src/modules/sidebarlook/Palettes.js';
import { ThemePalettes } from '../../../src/modules/sidebarlook/ThemePalettes.js';

test('maps each VivArcDi theme to its palette', () => {
  assert.equal(ThemePalettes.paletteFor('vivarcdi-light'), 'arclight');
  assert.equal(ThemePalettes.paletteFor('vivarcdi-pink'), 'arcpink');
  assert.equal(ThemePalettes.paletteFor('vivarcdi-green'), 'arcgreen');
  assert.equal(ThemePalettes.paletteFor('vivarcdi-dark'), 'arcdark');
  assert.equal(ThemePalettes.paletteFor('vivarcdi-pure-dark'), 'arcdarkpure');
});

test('gives no palette to a theme that is not from VivArcDi', () => {
  assert.equal(ThemePalettes.paletteFor('Vivaldi1'), undefined);
  assert.equal(ThemePalettes.paletteFor(undefined), undefined);
  assert.equal(ThemePalettes.paletteFor(42), undefined);
});

test('every mapped palette exists', () => {
  for (const name of ThemePalettes.names) {
    assert.ok(Palettes.names.includes(name), name);
  }
});
