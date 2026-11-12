import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ElementGestures } from '../../../src/modules/workspacesync/ElementGestures.js';
import type { ViewWindow } from '../../../src/modules/workspacesync/ElementGestures.js';
import { Logger } from '../../../src/core/support/Logger.js';
import { ReactEditorOpener } from '../../../src/modules/workspacesync/EditorOpener.js';
import type { MenuParts } from '../../../src/modules/workspacesync/MenuCommand.js';
import { Poll } from '../../../src/modules/workspacesync/Poll.js';
import { QuietMoment } from '../../../src/modules/workspacesync/QuietMoment.js';
import { ReactInternals } from '../../../src/modules/workspacesync/ReactInternals.js';
import { WorkspaceCreator } from '../../../src/modules/workspacesync/WorkspaceCreator.js';
import { WorkspaceMenu } from '../../../src/modules/workspacesync/WorkspaceMenu.js';
import { DisabledRenamer, WorkspaceRenamer } from '../../../src/modules/workspacesync/WorkspaceRenamer.js';
import { CountingSink, FakeNames } from './fakes.js';
import { FakeReactInternals, FakeVivaldiMenu, catalog, fakeView } from './popup.js';

const instantPoll = (): Poll => {
  let now = 0;
  return new Poll({ now: () => now, sleep: async (delayMs) => void (now += delayMs) });
};

const setup = (renamingIndex: number | null = 2): { vivaldi: FakeVivaldiMenu; names: FakeNames; sink: CountingSink; internals: FakeReactInternals; parts: MenuParts } => {
  const names = new FakeNames({ '7': 'Casetta', '8': 'Work' });
  const vivaldi = new FakeVivaldiMenu(names);
  const sink = new CountingSink();
  const poll = instantPoll();
  const internals = new FakeReactInternals(vivaldi, renamingIndex);
  const gestures = new ElementGestures(fakeView as unknown as ViewWindow);
  const document = vivaldi.document;
  const opener = new ReactEditorOpener(document, catalog, poll, internals as unknown as ReactInternals);
  const menu = new WorkspaceMenu(document, catalog, { gestures, poll, editor: opener });
  return { vivaldi, names, sink, internals, parts: { menu, quiet: new QuietMoment(document), names, poll, logger: new Logger('test', sink) } };
};

test('creates a workspace missing here', async () => {
  const { vivaldi, names, parts } = setup();
  assert.equal(await new WorkspaceCreator(parts).create('Riposino'), 'done');
  assert.deepEqual(names.names, ['Casetta', 'Work', 'Riposino']);
  const sequence = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
  for (const element of [vivaldi.button, vivaldi.history.workspaceCreate, vivaldi.history.workspaceSave]) {
    assert.deepEqual(element?.types, sequence);
    assert.equal(element?.events.every(({ init }) => init.clientX === 60 && init.clientY === 40 && init.bubbles === true), true);
  }
  assert.equal(vivaldi.history.workspaceTitle?.typed, 'Riposino');
  assert.deepEqual(vivaldi.history.workspaceTitle?.types, ['input']);
  assert.deepEqual(vivaldi.history.workspaceTitle?.events.map(({ init }) => init.bubbles), [true]);
  assert.deepEqual(vivaldi.body.types, ['keydown']);
  assert.equal(vivaldi.body.events[0]?.init.key, 'Escape');
  assert.equal(vivaldi.closed, true);
});

test('submits the form when the editor has no save button', async () => {
  const { vivaldi, names, parts } = setup();
  vivaldi.formOnly = true;
  assert.equal(await new WorkspaceCreator(parts).create('Riposino'), 'done');
  assert.equal(vivaldi.history.workspaceForm?.submitted, 1);
  assert.deepEqual(names.names, ['Casetta', 'Work', 'Riposino']);
});

test('waits for a quiet moment before driving the menu', async () => {
  const { vivaldi, parts } = setup();
  const creator = new WorkspaceCreator(parts);
  vivaldi.focus = false;
  assert.equal(await creator.create('Riposino'), 'deferred');
  vivaldi.focus = true;
  vivaldi.active = { tagName: 'INPUT', isContentEditable: false };
  assert.equal(await creator.create('Riposino'), 'deferred');
  vivaldi.active = { tagName: 'DIV', isContentEditable: true };
  assert.equal(await creator.create('Riposino'), 'deferred');
  assert.deepEqual(vivaldi.button.types, []);
  vivaldi.active = { tagName: 'DIV', isContentEditable: false };
  assert.equal(await creator.create('Riposino'), 'done');
});

test('stops after a failed step, closes the menu and does not try again', async () => {
  const { vivaldi, names, sink, parts } = setup();
  vivaldi.acceptsSave = false;
  const creator = new WorkspaceCreator(parts);
  assert.equal(await creator.create('Riposino'), 'failed');
  assert.deepEqual(names.names, ['Casetta', 'Work']);
  assert.equal(vivaldi.closed, true);
  assert.equal(vivaldi.body.events.length, 1);
  const pressed = vivaldi.button.events.length;
  assert.equal(await creator.create('Other'), 'failed');
  assert.equal(vivaldi.button.events.length, pressed);
  assert.equal(sink.warnings.length, 1);
});

test('renames a workspace through the editor that the fiber hooks open', async () => {
  const { vivaldi, names, internals, parts } = setup(2);
  const renamer = new WorkspaceRenamer(parts);
  assert.equal(await renamer.rename('Work', 'Lavoro'), true);
  assert.deepEqual(names.names, ['Casetta', 'Lavoro']);
  assert.deepEqual(internals.calls, [[0, 7], [0, undefined], [1, 7], [1, undefined], [2, 7]]);
  assert.equal(vivaldi.closed, true);
  assert.equal(await renamer.rename('Lavoro', 'Work'), true);
  assert.deepEqual(internals.calls.slice(5), [[2, 7]]);
});

test('gives up renaming when no hook opens the editor', async () => {
  const { vivaldi, names, internals, sink, parts } = setup(null);
  const renamer = new WorkspaceRenamer(parts);
  assert.equal(await renamer.rename('Work', 'Lavoro'), false);
  assert.deepEqual(names.names, ['Casetta', 'Work']);
  assert.deepEqual(internals.calls.filter(([, id]) => id === undefined).length, 4);
  assert.equal(vivaldi.closed, true);
  assert.equal(vivaldi.body.events.length, 1);
  assert.equal(await renamer.rename('Work', 'Lavoro'), false);
  assert.equal(sink.warnings.length, 1);
  assert.equal(await new DisabledRenamer().rename(), false);
});

test('fails to false when the fibers are not what it expects', async () => {
  const { names, internals, parts } = setup();
  internals.hooks = false;
  assert.equal(await new WorkspaceRenamer(parts).rename('Work', 'Lavoro'), false);
  assert.deepEqual(names.names, ['Casetta', 'Work']);
});

const hook = (memoizedState: unknown, dispatch: (value: unknown) => unknown, next: unknown = null): unknown => ({ memoizedState, queue: { dispatch }, next });

test('finds the workspace id and the candidate hooks in the fiber tree', () => {
  const calls: string[] = [];
  const note = (label: string): (() => void) => (): void => void calls.push(label);
  const list = { memoizedProps: { workspaces: [], hidePopup: note('hide') }, return: null, memoizedState: hook(undefined, note('a'), hook('x', note('b'), hook(undefined, note('c'), { memoizedState: 1, next: null }))) };
  const item = { memoizedProps: { isRenaming: false, id: 7 }, return: list };
  const inner = { memoizedProps: {}, return: item };
  const row = { __reactFiber$abc: inner } as unknown as Element;
  const found = new ReactInternals().renameHooks(row);
  assert.equal(found?.workspaceId, 7);
  found?.starters.forEach((start) => start(7));
  assert.deepEqual(calls, ['a', 'c']);
});

test('returns null for a row without the expected fibers', () => {
  const internals = new ReactInternals();
  assert.equal(internals.renameHooks({} as Element), null);
  assert.equal(internals.renameHooks({ __reactFiber$x: { memoizedProps: {}, return: null } } as unknown as Element), null);
  assert.equal(internals.renameHooks({ __reactFiber$x: { memoizedProps: { isRenaming: true, id: 'x' }, return: { memoizedProps: { workspaces: 1, hidePopup: 1 } } } } as unknown as Element), null);
  const fail = (): never => {
    throw new Error('no');
  };
  const throwing = Object.defineProperty({}, '__reactFiber$y', { get: fail, enumerable: true });
  assert.equal(internals.renameHooks(throwing as Element), null);
});

test('is quiet only when the window has focus and nothing takes text', () => {
  const { vivaldi } = setup();
  const quiet = new QuietMoment(vivaldi.document);
  assert.equal(quiet.now, true);
  vivaldi.active = { tagName: 'TEXTAREA', isContentEditable: false };
  assert.equal(quiet.now, false);
});
