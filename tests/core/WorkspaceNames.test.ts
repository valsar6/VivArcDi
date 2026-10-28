import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserPrefs } from '../../src/core/BrowserPrefs.js';
import { Logger } from '../../src/core/Logger.js';
import { TabData } from '../../src/core/TabData.js';
import { WorkspaceNames } from '../../src/core/WorkspaceNames.js';
import { CASETTA, FakePrefsApi, WORK } from './prefs.js';

const LIST = 'vivaldi.workspaces.list';
const tabIn = (workspaceId: number): chrome.tabs.Tab => ({ vivExtData: JSON.stringify({ workspaceId }) }) as unknown as chrome.tabs.Tab;

function recordingLogger(): { logger: Logger; warnings: unknown[][] } {
  const warnings: unknown[][] = [];
  const sink = { info: (): void => undefined, error: (): void => undefined, warn: (...message: unknown[]): void => void warnings.push(message) };
  return { logger: new Logger('test', sink), warnings };
}

test('finds the name of the workspace of a tab', async () => {
  const api = new FakePrefsApi();
  api.values.set(LIST, [CASETTA, WORK]);
  const names = new WorkspaceNames(new BrowserPrefs(api), () => undefined, recordingLogger().logger);
  await names.start();
  assert.equal(names.nameOf(TabData.of(tabIn(CASETTA.id))), 'Casetta');
  assert.equal(names.nameOf(TabData.of(tabIn(WORK.id))), 'Work');
  assert.equal(names.nameOf(TabData.of(tabIn(5))), null);
  assert.equal(names.nameOf(TabData.of({} as chrome.tabs.Tab)), null);
  names.stop();
});

test('follows a renamed workspace and a new one', async () => {
  const api = new FakePrefsApi();
  api.values.set(LIST, [CASETTA]);
  let changes = 0;
  const names = new WorkspaceNames(new BrowserPrefs(api), () => (changes += 1), recordingLogger().logger);
  await names.start();
  assert.equal(names.following, true);
  api.set(LIST, [{ ...CASETTA, name: 'Home' }, WORK]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(names.nameOf(String(CASETTA.id)), 'Home');
  assert.equal(names.nameOf(String(WORK.id)), 'Work');
  assert.equal(changes, 2);
  names.stop();
  assert.equal(api.listeners.size, 0);
});

test('reads the list again on request when changes are not announced', async () => {
  const api = new FakePrefsApi(false);
  api.values.set(LIST, [CASETTA]);
  const names = new WorkspaceNames(new BrowserPrefs(api), () => undefined, recordingLogger().logger);
  await names.start();
  assert.equal(names.following, false);
  api.set(LIST, [WORK]);
  await names.refresh();
  assert.equal(names.nameOf(String(WORK.id)), 'Work');
  assert.equal(names.nameOf(String(CASETTA.id)), null);
});

test('has no names and logs once when the preferences are missing or malformed', async () => {
  const missing = recordingLogger();
  const none = new WorkspaceNames(new BrowserPrefs(undefined), () => undefined, missing.logger);
  await none.start();
  await none.refresh();
  assert.equal(none.nameOf('1'), null);
  assert.equal(missing.warnings.length, 1);

  const api = new FakePrefsApi();
  api.values.set(LIST, [{ id: 1 }, 'x', null, { id: 2, name: 'Ok' }]);
  const malformed = new WorkspaceNames(new BrowserPrefs(api), () => undefined, recordingLogger().logger);
  await malformed.start();
  assert.equal(malformed.nameOf('2'), 'Ok');
  assert.equal(malformed.nameOf('1'), null);
});
