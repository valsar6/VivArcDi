import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Module } from '../../src/core/Module.js';
import type { ModuleContext, PrivateWindowPolicy } from '../../src/core/Module.js';
import { ModuleRegistry } from '../../src/core/ModuleRegistry.js';
import { createDefaultRegistry } from '../../src/modules/index.js';

class Alpha extends Module {
  public static override id = 'alpha';

  public override start(): void {}
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
  assert.ok(modules[0]?.module instanceof Alpha);
  assert.deepEqual(modules[0]?.options, { enabled: true, size: 3 });
  assert.deepEqual(unknown, ['beta']);
});

test('the base module refuses to start', () => {
  assert.throws(() => new Nameless().start({} as ModuleContext), /must implement start/);
});

class Allowed extends Module {
  public static override id = 'allowed';
  public static override privateWindows: PrivateWindowPolicy = 'allowed';
}

class Only extends Module {
  public static override id = 'only';
  public static override privateWindows: PrivateWindowPolicy = 'only';
}

test('createEnabled keeps modules out of private windows unless they opt in', () => {
  const registry = new ModuleRegistry().register(Alpha).register(Allowed).register(Only);
  const settings = { alpha: { enabled: true }, allowed: { enabled: true }, only: { enabled: true } };
  assert.deepEqual(registry.createEnabled(settings, true).modules.map(({ id }) => id), ['allowed', 'only']);
  assert.deepEqual(registry.createEnabled(settings, false).modules.map(({ id }) => id), ['alpha', 'allowed']);
  assert.deepEqual(registry.createEnabled(settings).modules.map(({ id }) => id), ['alpha', 'allowed']);
});

test('skips spaces, favorites and folders in a private window', () => {
  const settings = Object.fromEntries(
    ['activation-marker', 'favorites-grid', 'peek', 'reopen-pinned', 'bookmark-folders', 'folder-preview', 'pinned-tabs', 'space-header', 'today-archive', 'copy-url', 'incognito'].map((id) => [id, { enabled: true }]),
  );
  const ids = (privateWindow: boolean): string[] => createDefaultRegistry().createEnabled(settings, privateWindow).modules.map(({ id }) => id);
  assert.deepEqual(ids(true), ['activation-marker', 'peek', 'copy-url', 'incognito']);
  assert.equal(ids(false).length, 10);
  assert.equal(ids(false).includes('incognito'), false);
});
