import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserPrefs } from '../../src/core/BrowserPrefs.js';
import { FakePrefsApi } from './prefs.js';

test('reads the value of a preference', async () => {
  const api = new FakePrefsApi();
  api.values.set('vivaldi.workspaces.list', [{ id: 1, name: 'A', icon: 'x' }]);
  assert.deepEqual(await new BrowserPrefs(api).get('vivaldi.workspaces.list'), [{ id: 1, name: 'A', icon: 'x' }]);
});

test('calls the listener only for the preference it follows', () => {
  const api = new FakePrefsApi();
  const prefs = new BrowserPrefs(api);
  let calls = 0;
  const stop = prefs.onChange('vivaldi.workspaces.list', () => (calls += 1));
  api.set('other.pref', 1);
  api.set('vivaldi.workspaces.list', []);
  assert.equal(calls, 1);
  stop();
  assert.equal(api.listeners.size, 0);
});

test('reports that preferences are missing', async () => {
  const prefs = new BrowserPrefs(undefined);
  assert.equal(prefs.available, false);
  assert.equal(prefs.canFollow, false);
  await assert.rejects(async () => prefs.get('x'), /not available/);
  assert.throws(() => prefs.onChange('x', () => undefined), /not available/);
  assert.throws(() => new BrowserPrefs(new FakePrefsApi(false)).onChange('x', () => undefined), /onChanged/);
});
