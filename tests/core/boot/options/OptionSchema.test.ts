import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Option } from '../../../../src/core/boot/options/Option.js';
import { OptionSchema } from '../../../../src/core/boot/options/OptionSchema.js';
import type { OptionWarnings } from '../../../../src/core/boot/options/OptionSchema.js';

const SCHEMA = OptionSchema.of({
  shiftClick: Option.boolean(true),
  widthPercent: Option.number(90, { min: 40, max: 100 }),
  folder: Option.text('Favorites', { nonEmpty: true }),
  palette: Option.choice('arclight', ['arclight', 'sky']),
  workspaces: Option.textMap(),
});

function recorder(): OptionWarnings & { lines: string[] } {
  const lines: string[] = [];
  return { lines, warn: (...message: unknown[]): void => void lines.push(message.join(' ')) };
}

test('valid option reaches the module unchanged', () => {
  const warnings = recorder();
  const values = SCHEMA.check({ shiftClick: false, widthPercent: 40, folder: ' Mine ', palette: 'sky', workspaces: { Work: 'A/B' } }, warnings);
  assert.deepEqual(values, { shiftClick: false, widthPercent: 40, folder: 'Mine', palette: 'sky', workspaces: { Work: 'A/B' } });
  assert.deepEqual(warnings.lines, []);
});

test('missing option gets its default', () => {
  const warnings = recorder();
  assert.deepEqual(SCHEMA.check({ enabled: true }, warnings), { shiftClick: true, widthPercent: 90, folder: 'Favorites', palette: 'arclight', workspaces: {} });
  assert.deepEqual(warnings.lines, []);
});

test('option of the wrong type falls back to the default with a warning', () => {
  const warnings = recorder();
  const values = SCHEMA.check({ shiftClick: 'no', widthPercent: '50', folder: '  ', workspaces: { Work: 3 } }, warnings);
  assert.deepEqual(values, SCHEMA.defaults);
  assert.deepEqual(warnings.lines, [
    'option "shiftClick" is "no", not true or false: using true',
    'option "widthPercent" is "50", not a number from 40 to 100: using 90',
    'option "folder" is "  ", not a text that is not empty: using "Favorites"',
    'option "workspaces" is {"Work":3}, not an object whose values are texts: using {}',
  ]);
});

test('option out of range falls back to the default with a warning', () => {
  for (const widthPercent of [39, 500, Number.NaN, Infinity]) {
    const warnings = recorder();
    assert.equal(SCHEMA.check({ widthPercent }, warnings)?.widthPercent, 90, String(widthPercent));
    assert.equal(warnings.lines.length, 1, String(widthPercent));
  }
});

test('option outside its choices falls back to the default with a warning', () => {
  const warnings = recorder();
  assert.equal(SCHEMA.check({ palette: 'Sky' }, warnings)?.palette, 'arclight');
  assert.deepEqual(warnings.lines, ['option "palette" is "Sky", not one of arclight, sky: using "arclight"']);
});

test('unknown option is dropped with a warning', () => {
  const warnings = recorder();
  const values = SCHEMA.check({ enabled: true, widthPercnt: 50 }, warnings);
  assert.equal(values !== null && 'widthPercnt' in values, false);
  assert.deepEqual(warnings.lines, ['option "widthPercnt" is not known: ignored']);
});

test('a required option without a value makes the check fail with a warning', () => {
  const schema = OptionSchema.of({ clientId: Option.requiredText({ nonEmpty: true }) });
  const missing = recorder();
  assert.equal(schema.check({}, missing), null);
  assert.deepEqual(missing.lines, ['option "clientId" is required and missing: the module stays off']);
  const empty = recorder();
  assert.equal(schema.check({ clientId: ' ' }, empty), null);
  assert.deepEqual(empty.lines, ['option "clientId" is " ", not a text that is not empty: the module stays off']);
  assert.deepEqual(schema.check({ clientId: 'abc' }, recorder()), { clientId: 'abc' });
  assert.throws(() => schema.defaults);
});

test('a schema without options accepts only enabled', () => {
  const warnings = recorder();
  assert.deepEqual(OptionSchema.none.check({ enabled: true, extra: 1 }, warnings), {});
  assert.deepEqual(warnings.lines, ['option "extra" is not known: ignored']);
});
