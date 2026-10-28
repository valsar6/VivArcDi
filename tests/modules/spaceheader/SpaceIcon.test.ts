import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SpaceIcon } from '../../../src/modules/spaceheader/SpaceIcon.js';

test('shows a short emoji or symbol as text', () => {
  assert.deepEqual(SpaceIcon.of('❤️', 'Riposino'), { kind: 'text', text: '❤️' });
  assert.deepEqual(SpaceIcon.of('\u{1F468}‍\u{1F4BB}', 'Work'), { kind: 'text', text: '\u{1F468}‍\u{1F4BB}' });
  assert.deepEqual(SpaceIcon.of('★☆', 'Work'), { kind: 'text', text: '★☆' });
});

test('falls back to the first letter of the name', () => {
  assert.deepEqual(SpaceIcon.of('workspace_icon_1', 'casetta'), { kind: 'letter', text: 'C' });
  assert.deepEqual(SpaceIcon.of('AB', 'Work'), { kind: 'letter', text: 'W' });
  assert.deepEqual(SpaceIcon.of('★☆☇', 'Work'), { kind: 'letter', text: 'W' });
  assert.deepEqual(SpaceIcon.of(null, '  èlite'), { kind: 'letter', text: 'È' });
  assert.deepEqual(SpaceIcon.of('', ''), { kind: 'letter', text: '?' });
});
