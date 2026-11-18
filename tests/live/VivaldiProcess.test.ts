import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ProfileDirectory } from '../../scripts/live/ProfileDirectory.js';
import { VivaldiProcess } from '../../scripts/live/VivaldiProcess.js';
import { FakeChild, tempDir, writeJson } from './fakes.js';

const PORT = 53211;

async function labProfile(): Promise<ProfileDirectory> {
  const fixture = join(tempDir(), 'Preferences.json');
  writeJson(fixture, { vivaldi: { tabs: { bar: { position: 1 } } } });
  return ProfileDirectory.temporary(fixture);
}

test('harness starts Vivaldi on a temporary profile and a local port', async () => {
  const profile = await labProfile();
  const child = new FakeChild();
  const calls: Array<{ command: string; args: string[] }> = [];

  const vivaldi = await VivaldiProcess.start('/lab/Vivaldi', profile.path, (command, args) => {
    calls.push({ command, args });
    writeFileSync(join(profile.path, 'DevToolsActivePort'), `${PORT}\n/devtools/browser/abc\n`);
    return child;
  });

  assert.ok(profile.path.startsWith(tmpdir()));
  assert.equal(calls[0]?.command, '/lab/Vivaldi');
  assert.ok(calls[0]?.args.includes(`--user-data-dir=${profile.path}`));
  assert.ok(calls[0]?.args.includes('--remote-debugging-port=0'));
  assert.ok(calls[0]?.args.includes('--remote-debugging-address=127.0.0.1'));
  assert.ok(calls[0]?.args.includes('--remote-allow-origins=http://127.0.0.1'));
  assert.equal(vivaldi.endpoint, `http://127.0.0.1:${PORT}`);
  await profile.remove();
});

test('stops only the process it started, politely first', async () => {
  const profile = await labProfile();
  const child = new FakeChild();
  const vivaldi = await VivaldiProcess.start('/lab/Vivaldi', profile.path, () => {
    writeFileSync(join(profile.path, 'DevToolsActivePort'), `${PORT}\n`);
    return child;
  });

  await vivaldi.stop();

  assert.deepEqual(child.signals, ['SIGTERM']);
  await profile.remove();
});

test('fails when Vivaldi exits before opening the port', async () => {
  const profile = await labProfile();
  const child = new FakeChild();
  child.exitCode = 1;

  await assert.rejects(VivaldiProcess.start('/lab/Vivaldi', profile.path, () => child), /exited with code 1/);
  await profile.remove();
});

test('seeds the lab profile with the fixture preferences', async () => {
  const profile = await labProfile();

  const preferences = JSON.parse(readFileSync(join(profile.path, 'Default', 'Preferences'), 'utf8')) as object;

  assert.deepEqual(preferences, { vivaldi: { tabs: { bar: { position: 1 } } } });
  await profile.remove();
  assert.equal(existsSync(profile.path), false);
});

test('harness refuses a directory that holds a profile', async () => {
  const fixture = join(tempDir(), 'Preferences.json');
  writeJson(fixture, {});
  const withLocalState = tempDir();
  writeFileSync(join(withLocalState, 'Local State'), '{}');
  const withPreferences = tempDir();
  mkdirSync(join(withPreferences, 'Default'));
  writeFileSync(join(withPreferences, 'Default', 'Preferences'), '{}');
  const home = tempDir();
  const userRoot = join(home, '.config', 'vivaldi');

  await assert.rejects(ProfileDirectory.at(withLocalState, fixture, []), /already holds a Vivaldi profile/);
  await assert.rejects(ProfileDirectory.at(withPreferences, fixture, []), /already holds a Vivaldi profile/);
  await assert.rejects(ProfileDirectory.at(join(userRoot, 'Lab'), fixture, [userRoot]), /belongs to a Vivaldi profile/);
  assert.equal(readFileSync(join(withPreferences, 'Default', 'Preferences'), 'utf8'), '{}');
});
