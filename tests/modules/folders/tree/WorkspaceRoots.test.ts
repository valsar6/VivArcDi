import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Logger } from '../../../src/core/Logger.js';
import { WorkspaceRoots } from '../../../src/modules/folders/WorkspaceRoots.js';

function recordingLogger(): { logger: Logger; warnings: unknown[][] } {
  const warnings: unknown[][] = [];
  const sink = { info: (): void => undefined, error: (): void => undefined, warn: (...message: unknown[]): void => void warnings.push(message) };
  return { logger: new Logger('test', sink), warnings };
}

const OPTIONS = { root: 'Imported/Bar', workspaces: { Work: 'Imported/Bar/Work', Music: ' Imported / Bar/Music/ ', Quiet: '' } };

test('reads the root folder of each workspace from the options', () => {
  const roots = new WorkspaceRoots(OPTIONS, recordingLogger().logger);
  assert.deepEqual(roots.rootFor('Work'), ['Imported', 'Bar', 'Work']);
  assert.deepEqual(roots.rootFor('Music'), ['Imported', 'Bar', 'Music']);
  assert.deepEqual(roots.rootFor('Quiet'), []);
  assert.deepEqual(roots.allPaths, [['Imported', 'Bar'], ['Imported', 'Bar', 'Work'], ['Imported', 'Bar', 'Music']]);
});

test('falls back to the default root for a workspace with no entry', () => {
  const roots = new WorkspaceRoots(OPTIONS, recordingLogger().logger);
  assert.deepEqual(roots.rootFor('Hobbies'), ['Imported', 'Bar']);
  assert.deepEqual(roots.rootFor(null), ['Imported', 'Bar']);
  const empty = new WorkspaceRoots({ root: '', workspaces: undefined }, recordingLogger().logger);
  assert.deepEqual(empty.allPaths, []);
});

test('uses a folder named after the workspace as its root', () => {
  const roots = new WorkspaceRoots({ root: '', workspaces: { Work: 'Imported/Bar/Work', Quiet: '' } }, recordingLogger().logger);
  assert.deepEqual(roots.rootFor('Casetta'), ['VivArcDi', 'Casetta']);
  assert.deepEqual(roots.rootFor(null), ['VivArcDi', 'Tabs']);
  assert.deepEqual(roots.rootFor('Work'), ['Imported', 'Bar', 'Work']);
  assert.deepEqual(roots.rootFor('Quiet'), []);
  assert.deepEqual(roots.pathsFor(['Casetta', 'Work', 'Quiet', null, 'Casetta']), [['VivArcDi', 'Casetta'], ['Imported', 'Bar', 'Work'], ['VivArcDi', 'Tabs']]);
});

test('takes the base of the default folders from the option workspacesBase', () => {
  const custom = new WorkspaceRoots({ root: '', workspaces: undefined, workspacesBase: ' Mine / Spaces ' }, recordingLogger().logger);
  assert.deepEqual(custom.rootFor('Casetta'), ['Mine', 'Spaces', 'Casetta']);
  assert.deepEqual(custom.rootFor(null), ['Mine', 'Spaces', 'Tabs']);
  for (const workspacesBase of ['', '  ', 7, undefined]) {
    const roots = new WorkspaceRoots({ root: '', workspaces: undefined, workspacesBase }, recordingLogger().logger);
    assert.deepEqual(roots.rootFor('Casetta'), ['VivArcDi', 'Casetta']);
  }
});

test('ignores an invalid workspaces option', () => {
  for (const workspaces of ['Work', ['Work'], null, { Work: 3 }, { Work: 'A', Music: ['B'] }]) {
    const { logger, warnings } = recordingLogger();
    const roots = new WorkspaceRoots({ root: 'Imported/Bar', workspaces }, logger);
    assert.deepEqual(roots.rootFor('Work'), ['Imported', 'Bar'], JSON.stringify(workspaces));
    assert.equal(warnings.length, 1, JSON.stringify(workspaces));
  }
});

test('does not log when the option workspaces is absent', () => {
  const { logger, warnings } = recordingLogger();
  new WorkspaceRoots({ root: 'A', workspaces: undefined }, logger);
  assert.equal(warnings.length, 0);
});
