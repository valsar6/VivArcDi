import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InspectionTarget } from '../../../src/core/tabs/InspectionTarget.js';

test('recognises the vivaldi inspect page in both of its forms', () => {
  assert.equal(InspectionTarget.is('vivaldi://inspect/#apps'), true);
  assert.equal(InspectionTarget.is('vivaldi:inspect/#apps'), true);
});

test('recognises the devtools windows the inspect page opens', () => {
  assert.equal(InspectionTarget.is('devtools://devtools/bundled/inspector.html?ws=127.0.0.1:9222'), true);
  assert.equal(InspectionTarget.is('chrome-devtools://devtools/bundled/inspector.html'), true);
});

test('leaves every other page alone', () => {
  assert.equal(InspectionTarget.is('vivaldi://settings'), false);
  assert.equal(InspectionTarget.is('vivaldi:settings'), false);
  assert.equal(InspectionTarget.is('https://example.com/'), false);
});

test('treats a missing or malformed address as a normal page', () => {
  assert.equal(InspectionTarget.is(undefined), false);
  assert.equal(InspectionTarget.is(''), false);
  assert.equal(InspectionTarget.is('not an address'), false);
});
