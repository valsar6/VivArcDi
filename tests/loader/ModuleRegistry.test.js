import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Module } from '../../src/core/Module.js';
import { ModuleRegistry } from '../../src/core/ModuleRegistry.js';

class Alpha extends Module {
  static id = 'alpha';
  start() {}
}

class Nameless extends Module {}

test('register rejects modules without an id', () => {
  assert.throws(() => new ModuleRegistry().register(Nameless), /no static id/);
});

test('register rejects duplicate ids', () => {
  const registry = new ModuleRegistry().register(Alpha);
  assert.throws(() => registry.register(Alpha), /already registered/);
});

test('createEnabled instantiates only enabled modules', () => {
  const registry = new ModuleRegistry().register(Alpha);
  const { modules, unknown } = registry.createEnabled({
    alpha: { enabled: true, size: 3 },
    beta: { enabled: true },
    gamma: { enabled: false },
  });
  assert.equal(modules.length, 1);
  assert.ok(modules[0].module instanceof Alpha);
  assert.deepEqual(modules[0].options, { enabled: true, size: 3 });
  assert.deepEqual(unknown, ['beta']);
});

test('the base module refuses to start', () => {
  assert.throws(() => new Nameless().start({}), /must implement start/);
});
