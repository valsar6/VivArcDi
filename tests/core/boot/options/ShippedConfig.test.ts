import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ModuleSettings } from '../../../../src/core/boot/ModuleSettings.js';
import { Logger } from '../../../../src/core/support/Logger.js';
import { createDefaultRegistry } from '../../../../src/modules/index.js';
import { SilentSink } from '../../../loader/fakes.js';

const CONFIG_PATH = new URL('../../../../src/config.json', import.meta.url);

test('shipped config fits every module schema', () => {
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as { modules: Record<string, unknown> };
  const registry = createDefaultRegistry();
  const sink = new SilentSink();
  const settings = ModuleSettings.check(config.modules, registry, new Logger('test', sink));
  for (const id of Object.keys(config.modules)) {
    assert.ok(registry.has(id), id);
    assert.notEqual(settings.optionsOf(id), null, id);
  }
  assert.deepEqual(sink.lines, []);
});
