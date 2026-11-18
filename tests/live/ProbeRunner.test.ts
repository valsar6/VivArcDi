import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Driver } from '../../scripts/live/Driver.js';
import { ProbeGuard } from '../../scripts/live/probe/ProbeGuard.js';
import { ProbeRunner } from '../../scripts/live/probe/ProbeRunner.js';

function recordingDriver(values: unknown[]): { driver: Driver; evaluated: string[] } {
  const evaluated: string[] = [];
  const driver = {
    evaluate: async (expression: string) => {
      evaluated.push(expression);
      return values.shift();
    },
  } as unknown as Driver;
  return { driver, evaluated };
}

test('probe with a write call is rejected', async () => {
  const { driver, evaluated } = recordingDriver([]);
  const probes = [
    "await chrome.storage.local.set({ 'vivarcdi.x': 1 });",
    'await chrome.bookmarks.removeTree(id);',
    "vivaldi.prefs.set({ path: 'vivaldi.tabs.bar.position', value: 0 });",
    "localStorage.setItem('a', 'b');",
  ];

  for (const probe of probes) {
    await assert.rejects(new ProbeRunner(driver).run(probe), /was not run because it writes data/);
  }
  assert.deepEqual(evaluated, []);
});

test('read-only probes pass the guard', () => {
  const probe = "const items = await chrome.storage.local.get('vivarcdi.sync');\nreturn chrome.bookmarks.getTree();";

  assert.deepEqual(ProbeGuard.writeCalls(probe), []);
});

test('probe returns its value or the stored vivarcdiResult', async () => {
  const returned = recordingDriver([{ tabs: 3 }]);
  assert.deepEqual(await new ProbeRunner(returned.driver).run('return { tabs: 3 };'), { tabs: 3 });
  assert.match(returned.evaluated[0] ?? '', /^\(async \(\) => \{\nreturn \{ tabs: 3 \};\n\}\)\(\)$/);

  const stored = recordingDriver([undefined, { rows: 2 }]);
  assert.deepEqual(await new ProbeRunner(stored.driver).run('globalThis.vivarcdiResult = { rows: 2 };'), { rows: 2 });
  assert.equal(stored.evaluated[1], 'globalThis.vivarcdiResult');
});
