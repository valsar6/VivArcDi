import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { SelectorCatalog } from '../../src/core/dom/SelectorCatalog.js';
import { SelectorCheck } from '../../scripts/live/checks/SelectorCheck.js';
import type { SelectorState } from '../../scripts/live/checks/SelectorStates.js';
import type { Driver } from '../../scripts/live/Driver.js';
import type { Session } from '../../scripts/live/Session.js';
import { tempDir, writeJson } from './fakes.js';

function session(present: string[]): Session {
  const driver = {
    waitFor: async (expression: string) => {
      if (!present.some((css) => expression === `document.querySelector(${JSON.stringify(css)})`)) {
        throw new Error(`Timed out waiting for ${expression}`);
      }
    },
  } as unknown as Driver;
  return { driver, console: undefined as never };
}

function state(name: string, log: string[], fails = false): SelectorState {
  return {
    enter: async (): Promise<void> => {
      log.push(`enter ${name}`);
      if (fails) {
        throw new Error('no button');
      }
    },
    leave: async () => void log.push(`leave ${name}`),
  };
}

test('selector check reports every selector of the version', async () => {
  const log: string[] = [];
  const selectors = { browser: '#browser', tabStrip: '.tab-strip', workspacePopup: '.WorkspacePopup', splitView: '.split' };
  const states = { workspacePopup: 'workspace-popup', splitView: { notChecked: 'needs a split view' } };
  const known = { default: state('default', log), 'workspace-popup': state('workspace-popup', log) };

  const results = await new SelectorCheck(selectors, states, known).run(session(['#browser', '.WorkspacePopup']));

  assert.deepEqual(
    results.map(({ name, outcome }) => [name, outcome]),
    [
      ['selector browser', 'pass'],
      ['selector tabStrip', 'fail'],
      ['selector workspacePopup', 'pass'],
      ['selector splitView', 'not checked'],
    ],
  );
  assert.equal(results[3]?.detail, 'needs a split view');
  assert.deepEqual(log, ['enter default', 'leave default', 'enter workspace-popup', 'leave workspace-popup']);
});

test('fails the selectors of a state the harness cannot enter', async () => {
  const known = { default: state('default', []), 'pinned-tab': state('pinned-tab', [], true) };

  const results = await new SelectorCheck({ pinnedTab: '.is-pinned' }, { pinnedTab: 'pinned-tab' }, known).run(session([]));

  assert.equal(results[0]?.outcome, 'fail');
  assert.match(results[0]?.detail ?? '', /could not enter pinned-tab: Error: no button/);
});

test('selector check matches versions like the catalog', async () => {
  const folder = tempDir();
  writeJson(join(folder, 'index.json'), { versions: ['8.1', '8.4'] });
  writeJson(join(folder, '8.1.json'), { browser: '#browser-81' });
  writeJson(join(folder, '8.4.json'), { browser: '#browser-84' });

  for (const vivaldi of ['8.3.4191.44', '8.5.1.2', '8.0.1.1', 'unknown']) {
    const catalog = await SelectorCheck.catalogFor(folder, vivaldi);
    const expected = SelectorCatalog.bestMatch(['8.1', '8.4'], vivaldi);
    assert.equal(catalog.version, expected, vivaldi);
  }
  assert.deepEqual(await SelectorCheck.catalogFor(folder, '8.3.4191.44'), { version: '8.1', selectors: { browser: '#browser-81' } });
  assert.deepEqual(await SelectorCheck.catalogFor(folder, '8.0.1.1'), { version: null, selectors: {} });
});
