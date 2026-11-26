import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ShapeGuards } from '../../../src/core/boot/ShapeGuards.js';
import type { ShapeProbe } from '../../../src/core/boot/ShapeGuards.js';
import { Logger } from '../../../src/core/support/Logger.js';
import { SilentSink } from '../../loader/fakes.js';

const probe = (name: string, holds: () => boolean): ShapeProbe => ({ name, expects: `${name} expected`, holds });

const setup = (): { sink: SilentSink; guards: ShapeGuards } => {
  const sink = new SilentSink();
  return { sink, guards: new ShapeGuards(new Logger('test:shape', sink)) };
};

test('a probe that fails or throws is a finding and run never throws', () => {
  const { sink, guards } = setup();
  guards.add(probe('ok', () => true));
  guards.add(probe('fails', () => false));
  guards.add(
    probe('throws', () => {
      throw new Error('no');
    }),
  );
  assert.deepEqual(guards.run(), [
    { name: 'fails', expects: 'fails expected' },
    { name: 'throws', expects: 'throws expected' },
  ]);
  assert.equal(sink.lines.length, 0);
});

test('a probe with the same name replaces the first and runs once', () => {
  const { guards } = setup();
  const calls: string[] = [];
  guards.add(probe('same', () => (calls.push('first'), true)));
  guards.add(probe('same', () => (calls.push('second'), true)));
  guards.run();
  assert.deepEqual(calls, ['second']);
});

test('run keeps the order of registration', () => {
  const { guards } = setup();
  guards.add(probe('b', () => false));
  guards.add(probe('a', () => false));
  assert.deepEqual(
    guards.run().map((finding) => finding.name),
    ['b', 'a'],
  );
});

test('report warns once per key', () => {
  const { sink, guards } = setup();
  guards.report('k', 'first');
  guards.report('k', 'second');
  guards.report('other', 'third');
  assert.deepEqual(
    sink.lines.map((line) => [line[0], line.slice(2).join(' ')]),
    [
      ['warn', 'Vivaldi UI shape: first'],
      ['warn', 'Vivaldi UI shape: third'],
    ],
  );
});
