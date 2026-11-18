import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOOT_CHECK_NAME } from '../../scripts/live/checks/BootCheck.js';
import { ScenarioCatalog } from '../../scripts/live/scenarios/ScenarioCatalog.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LIVE_CHECK = /live: `([^`]+)`/g;

function liveChecks(): Map<string, string> {
  const specs = join(ROOT, 'specs');
  const checks = new Map<string, string>();
  for (const folder of readdirSync(specs).filter((name) => /^\d{3}-/.test(name))) {
    const text = readFileSync(join(specs, folder, 'spec.md'), 'utf8');
    for (const [, name] of text.matchAll(LIVE_CHECK)) {
      checks.set(name ?? '', folder.slice(0, 3));
    }
  }
  return checks;
}

test('every live check has a scenario', async () => {
  const scenarios = await ScenarioCatalog.load(join(ROOT, 'tests', 'live', 'scenarios'));
  const checks = liveChecks();
  const provided = new Set([BOOT_CHECK_NAME, ...scenarios.map((scenario) => scenario.name)]);

  assert.deepEqual([...checks.keys()].filter((name) => !provided.has(name)), []);
  for (const scenario of scenarios) {
    assert.equal(checks.get(scenario.name), scenario.spec, `${scenario.name} proves no criterion of spec ${scenario.spec}`);
  }
});

test('scenarios are selected by name or spec number', async () => {
  const scenarios = await ScenarioCatalog.load(join(ROOT, 'tests', 'live', 'scenarios'));

  assert.equal(ScenarioCatalog.select(scenarios, []).length, scenarios.length);
  assert.deepEqual(ScenarioCatalog.select(scenarios, ['011']).map((scenario) => scenario.spec), ['011']);
  assert.deepEqual(ScenarioCatalog.select(scenarios, ['nothing']), []);
});
