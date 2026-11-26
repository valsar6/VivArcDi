import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ShapeGuards } from '../../../src/core/boot/ShapeGuards.js';
import { Logger } from '../../../src/core/support/Logger.js';
import { ReactInternals } from '../../../src/shared/spaces/ReactInternals.js';
import { ReactProbe } from '../../../src/shared/spaces/ReactProbe.js';
import { SilentSink } from '../../loader/fakes.js';

const SELECTORS = { get: (): string => '#browser' };

const documentOf = (element: unknown): Document => ({ querySelector: () => element }) as unknown as Document;

test('React probe passes when the interface carries a fiber', () => {
  const own = { __reactFiber$abc: {}, children: [] };
  const child = { children: [{ __reactFiber$abc: {}, children: [] }] };
  assert.equal(new ReactProbe(documentOf(own), SELECTORS).holds(), true);
  assert.equal(new ReactProbe(documentOf(child), SELECTORS).holds(), true);
});

test('React probe fails without a fiber and never throws', () => {
  const failing = (): never => {
    throw new Error('no');
  };
  const throwing = { get children(): never { return failing(); } };
  assert.equal(new ReactProbe(documentOf(null), SELECTORS).holds(), false);
  assert.equal(new ReactProbe(documentOf({ children: [{ children: [] }] }), SELECTORS).holds(), false);
  assert.equal(new ReactProbe(documentOf(throwing), SELECTORS).holds(), false);
  assert.equal(new ReactProbe(documentOf({ children: [] }), { get: failing }).holds(), false);
});

test('a missing React shape at first use warns once', () => {
  const sink = new SilentSink();
  const guards = new ShapeGuards(new Logger('test:shape', sink));
  const first = new ReactInternals(guards);
  const second = new ReactInternals(guards);
  for (let call = 0; call < 3; call += 1) {
    assert.equal(first.renameHooks({} as Element), null);
    assert.equal(second.renameHooks({} as Element), null);
  }
  const lines = sink.lines.filter(([level]) => level === 'warn');
  assert.equal(lines.length, 1);
  assert.ok(String(lines[0]?.slice(2).join(' ')).startsWith('Vivaldi UI shape: '));
});
