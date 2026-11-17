import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Logger } from '../../../../src/core/support/Logger.js';
import { BOOKMARK_FOLDERS_OPTIONS } from '../../../../src/modules/folders/BookmarkFoldersOptions.js';
import { WorkspaceRoots } from '../../../../src/modules/folders/tree/WorkspaceRoots.js';

function recordingLogger(): { logger: Logger; warnings: unknown[][] } {
  const warnings: unknown[][] = [];
  const sink = { info: (): void => undefined, error: (): void => undefined, warn: (...message: unknown[]): void => void warnings.push(message) };
  return { logger: new Logger('test', sink), warnings };
}

function rootsOf(raw: Record<string, unknown>): { roots: WorkspaceRoots; warnings: unknown[][] } {
  const { logger, warnings } = recordingLogger();
  const values = BOOKMARK_FOLDERS_OPTIONS.check(raw, logger);
  assert.ok(values !== null);
  return { roots: new WorkspaceRoots(values), warnings };
}

const OPTIONS = { root: 'Imported/Bar', workspaces: { Work: 'Imported/Bar/Work', Music: ' Imported / Bar/Music/ ', Quiet: '' } };

test('reads the root folder of each workspace from the options', () => {
  const { roots } = rootsOf(OPTIONS);
  assert.deepEqual(roots.rootFor('Work'), ['Imported', 'Bar', 'Work']);
  assert.deepEqual(roots.rootFor('Music'), ['Imported', 'Bar', 'Music']);
  assert.deepEqual(roots.rootFor('Quiet'), []);
  assert.deepEqual(roots.allPaths, [['Imported', 'Bar'], ['Imported', 'Bar', 'Work'], ['Imported', 'Bar', 'Music']]);
});

test('falls back to the default root for a workspace with no entry', () => {
  const { roots } = rootsOf(OPTIONS);
  assert.deepEqual(roots.rootFor('Hobbies'), ['Imported', 'Bar']);
  assert.deepEqual(roots.rootFor(null), ['Imported', 'Bar']);
  assert.deepEqual(rootsOf({}).roots.allPaths, []);
});

test('uses a folder named after the workspace as its root', () => {
  const { roots } = rootsOf({ workspaces: { Work: 'Imported/Bar/Work', Quiet: '' } });
  assert.deepEqual(roots.rootFor('Casetta'), ['VivArcDi', 'Casetta']);
  assert.deepEqual(roots.rootFor(null), ['VivArcDi', 'Tabs']);
  assert.deepEqual(roots.rootFor('Work'), ['Imported', 'Bar', 'Work']);
  assert.deepEqual(roots.rootFor('Quiet'), []);
  assert.deepEqual(roots.pathsFor(['Casetta', 'Work', 'Quiet', null, 'Casetta']), [['VivArcDi', 'Casetta'], ['Imported', 'Bar', 'Work'], ['VivArcDi', 'Tabs']]);
});

test('takes the base of the default folders from the option workspacesBase', () => {
  const { roots: custom } = rootsOf({ workspacesBase: ' Mine / Spaces ' });
  assert.deepEqual(custom.rootFor('Casetta'), ['Mine', 'Spaces', 'Casetta']);
  assert.deepEqual(custom.rootFor(null), ['Mine', 'Spaces', 'Tabs']);
  for (const workspacesBase of ['', '  ', 7, undefined]) {
    const { roots } = rootsOf({ workspacesBase });
    assert.deepEqual(roots.rootFor('Casetta'), ['VivArcDi', 'Casetta']);
  }
});

test('ignores an invalid workspaces option', () => {
  for (const workspaces of ['Work', ['Work'], null, { Work: 3 }, { Work: 'A', Music: ['B'] }]) {
    const { logger, warnings } = recordingLogger();
    const values = BOOKMARK_FOLDERS_OPTIONS.check({ root: 'Imported/Bar', workspaces }, logger);
    assert.ok(values !== null);
    assert.deepEqual(values.workspaces, {}, JSON.stringify(workspaces));
    assert.deepEqual(new WorkspaceRoots(values).rootFor('Work'), ['Imported', 'Bar'], JSON.stringify(workspaces));
    assert.equal(warnings.length, 1, JSON.stringify(workspaces));
  }
});

test('does not log when the option workspaces is absent', () => {
  const { warnings } = rootsOf({ root: 'A' });
  assert.equal(warnings.length, 0);
});
