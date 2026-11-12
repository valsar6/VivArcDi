import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultRegistry } from '../../../src/modules/index.js';
import { WorkspaceSync } from '../../../src/modules/workspacesync/WorkspaceSync.js';
import { WorkspaceSettings } from '../../../src/modules/workspacesync/WorkspaceSettings.js';
import { Logger } from '../../../src/core/support/Logger.js';
import { WritableChrome, bookmarkTree } from '../folders/fakes.js';
import { CountingSink, FOLDER, page, listIn, pinnedIn, pinnedTab, world } from './fakes.js';
import type { SpaceEntry } from '../../../src/modules/workspacesync/SpaceEntry.js';
import { SyncStore } from '../../../src/modules/workspacesync/SyncStore.js';

const shipped = (JSON.parse(readFileSync('src/config.json', 'utf8')) as { modules: Record<string, { enabled: boolean; folder: string; renameFromOtherComputers: boolean }> }).modules['workspace-sync'] ?? { enabled: false, folder: '', renameFromOtherComputers: false };

const callsOf = (tabs: { tabCalls(): Array<[string, ...unknown[]]> }): string[] => tabs.tabCalls().map(([name]) => name);

const writesOf = (calls: string[]): string[] => calls.filter((call) => /^(create|update|remove|removeTree) /.test(call));

test('copies a newly pinned tab', async () => {
  const { pass, chrome, tabs } = world({ tabs: [pinnedTab(1, 'mail'), pinnedTab(2, 'docs')], store: { Casetta: ['mail'] }, base: { Casetta: ['mail'] } });
  await pass.run();
  assert.deepEqual(pinnedIn(chrome, 'Casetta'), ['mail', 'docs']);
  assert.deepEqual(tabs.tabCalls(), []);
});

test('removes an unpinned tab from the copy', async () => {
  const { pass, chrome, tabs } = world({ tabs: [pinnedTab(1, 'mail')], store: { Casetta: ['mail', 'docs'] }, base: { Casetta: ['mail', 'docs'] } });
  await pass.run();
  assert.deepEqual(pinnedIn(chrome, 'Casetta'), ['mail']);
  assert.deepEqual(tabs.tabCalls(), []);
});

test('stores the order of pinned tabs', async () => {
  const { pass, chrome, tabs } = world({ tabs: [pinnedTab(2, 'docs'), pinnedTab(1, 'mail')], store: { Casetta: ['mail', 'docs'] }, base: { Casetta: ['mail', 'docs'] } });
  await pass.run();
  assert.deepEqual(pinnedIn(chrome, 'Casetta'), ['docs', 'mail']);
  assert.deepEqual(tabs.tabCalls(), []);
});

test('opens a missing pinned tab unloaded', async () => {
  const { pass, tabs, chrome } = world({ tabs: [pinnedTab(1, 'mail')], store: { Casetta: ['docs', 'mail'] }, base: { Casetta: ['mail'] } });
  await pass.run();
  assert.deepEqual(tabs.tabCalls(), [
    ['create', { url: page('docs'), active: false, pinned: true, windowId: 1 }],
    ['update', 100, { vivExtData: JSON.stringify({ workspaceId: 7, vivarcdi: { pinnedUrl: page('docs') } }) }],
    ['discard', 100],
    ['move', 100, 0],
  ]);
  assert.deepEqual(tabs.order, [100, 1]);
  assert.deepEqual(writesOf(chrome.calls), []);
});

test('closes a pinned tab removed elsewhere', async () => {
  const { pass, tabs } = world({ tabs: [pinnedTab(1, 'mail'), pinnedTab(2, 'docs')], store: { Casetta: ['mail'] }, base: { Casetta: ['mail', 'docs'] } });
  await pass.run();
  assert.deepEqual(tabs.tabCalls(), [['remove', 2]]);
});

test('keeps a busy tab removed elsewhere', async () => {
  const away = pinnedTab(3, 'news', { url: 'https://other.example/story' });
  const { pass, tabs } = world({
    tabs: [pinnedTab(1, 'mail'), pinnedTab(2, 'docs', { active: true }), away],
    store: { Casetta: ['mail'] },
    base: { Casetta: ['mail', 'docs', 'news'] },
  });
  await pass.run();
  assert.deepEqual(tabs.tabCalls(), [
    ['update', 2, { pinned: false }],
    ['update', 3, { pinned: false }],
  ]);
});

test('does not echo applied changes', async () => {
  const { pass, tabs, chrome, base } = world({ tabs: [pinnedTab(1, 'mail'), pinnedTab(3, 'news')], store: { Casetta: ['mail', 'docs'] }, base: { Casetta: ['mail', 'news'] } });
  await pass.run();
  assert.deepEqual(callsOf(tabs), ['remove', 'create', 'update', 'discard']);
  assert.deepEqual(writesOf(chrome.calls), []);
  assert.deepEqual(pinnedIn(chrome, 'Casetta'), ['mail', 'docs']);
  assert.deepEqual(base.get('Casetta'), ['mail.example', 'docs.example']);
  const tabCalls = tabs.tabCalls().length;
  const bookmarkCalls = chrome.calls.length;
  await pass.run();
  assert.equal(tabs.tabCalls().length, tabCalls);
  assert.deepEqual(writesOf(chrome.calls.slice(bookmarkCalls)), []);
});

test('matches workspaces across computers', async () => {
  const { pass, tabs } = world({ store: { Casetta: ['mail'], Work: ['docs'], Elsewhere: ['news'] }, workspaces: { '1794297902728': 'Casetta', '1794297902999': 'Work' } });
  await pass.run();
  const created = tabs.tabCalls().filter(([name]) => name === 'update');
  assert.deepEqual(
    created.map(([, , change]) => change),
    [
      { vivExtData: JSON.stringify({ workspaceId: 1794297902728, vivarcdi: { pinnedUrl: page('mail') } }) },
      { vivExtData: JSON.stringify({ workspaceId: 1794297902999, vivarcdi: { pinnedUrl: page('docs') } }) },
    ],
  );
});

test('keeps workspace settings in the sync store', async () => {
  const chrome = new WritableChrome(bookmarkTree([]));
  const sink = new CountingSink();
  const settings = new WorkspaceSettings(new SyncStore(chrome.reader, chrome.writer, FOLDER), new Logger('test', sink));
  assert.equal(await settings.get('Casetta', 'themeColor'), undefined);
  await settings.set('Casetta', 'themeColor', '#336699');
  await settings.set('Casetta', 'themeColor', '#336699');
  await settings.set('Casetta', 'layout', 'wide');
  assert.equal(chrome.calls.filter((call) => call.startsWith('update')).length, 2);
  const otherComputer = new WorkspaceSettings(new SyncStore(chrome.reader, chrome.writer, FOLDER), new Logger('test', sink));
  assert.equal(await otherComputer.get('Casetta', 'themeColor'), '#336699');
  assert.equal(await otherComputer.get('Work', 'themeColor'), undefined);
  const [root] = (await chrome.reader.getTree()).flatMap((node) => JSON.stringify(node).includes(FOLDER) ? [node] : []);
  const text = JSON.stringify(root);
  assert.match(text, /https:\/\/vivarcdi\.invalid\/settings/);
  assert.match(text, /themeColor/);
  assert.equal(sink.warnings.length, 0);
});

test('ignores settings that are not valid JSON and says so once', async () => {
  const chrome = new WritableChrome(bookmarkTree([]));
  const sink = new CountingSink();
  const store = new SyncStore(chrome.reader, chrome.writer, FOLDER);
  await store.writeSettings('Casetta', '{broken');
  const settings = new WorkspaceSettings(store, new Logger('test', sink));
  assert.equal(await settings.get('Casetta', 'themeColor'), undefined);
  await settings.set('Casetta', 'themeColor', '#336699');
  assert.equal(await settings.get('Casetta', 'themeColor'), '#336699');
  assert.equal(sink.warnings.length, 1);
});

test('falls back when the sync store fails', async () => {
  const reading = world({ tabs: [pinnedTab(1, 'mail')], store: { Casetta: ['mail', 'docs'] }, base: { Casetta: ['mail', 'docs'] } });
  reading.chrome.failing.add('getTree');
  await reading.pass.run();
  await reading.pass.run();
  assert.equal(reading.sink.warnings.length, 1);
  assert.deepEqual(reading.tabs.tabCalls(), []);
  const writing = world({ tabs: [pinnedTab(1, 'mail'), pinnedTab(2, 'docs')], store: { Casetta: ['mail'] }, base: { Casetta: ['mail'] } });
  writing.chrome.failing.add('create');
  await writing.pass.run();
  await writing.pass.run();
  assert.equal(writing.sink.warnings.length, 1);
  assert.deepEqual(writing.tabs.tabCalls(), []);
  assert.deepEqual(writing.base.get('Casetta'), ['mail.example']);
});

test('does nothing when disabled', async () => {
  const registry = createDefaultRegistry();
  assert.equal(registry.has(WorkspaceSync.id), true);
  const settings = { 'workspace-sync': { ...shipped, enabled: false } };
  assert.deepEqual(registry.createEnabled(settings).modules, []);
  assert.deepEqual(registry.createEnabled({ 'workspace-sync': shipped }, true).modules, []);
  assert.equal(registry.createEnabled({ 'workspace-sync': shipped }).modules.length, 1);
  assert.equal(shipped.enabled, true);
  assert.equal(shipped.folder, WorkspaceSync.defaults.folder);
  assert.equal(shipped.renameFromOtherComputers, true);
  assert.equal(WorkspaceSync.defaults.renameFromOtherComputers, true);
});

const entry = (syncId: string, name: string, icon: string | null = null): SpaceEntry => ({ syncId, name, icon, iconId: null });

test('creates a workspace missing here through the creator and links it', async () => {
  const { pass, creator, ids, announced, tabs, spaceBase } = world({
    store: { Casetta: [], Work: ['docs'] },
    spaces: [entry('s-7', 'Casetta'), entry('s-x', 'Work')],
  });
  await pass.run();
  assert.deepEqual(creator.calls, ['Work']);
  assert.equal(ids.syncIdOf('900'), 's-x');
  assert.deepEqual(announced, []);
  assert.equal(tabs.tabCalls().filter(([name]) => name === 'create').length, 1);
  assert.deepEqual(spaceBase.get()?.map(({ syncId }) => syncId), ['s-7', 's-x']);
  await pass.run();
  assert.deepEqual(creator.calls, ['Work']);
});

test('stores the list of workspaces', async () => {
  const { pass, chrome, ids, names, spaceBase } = world({ workspaces: { '7': 'Casetta', '8': 'Work' }, links: { '7': 's-7' }, spaces: [entry('s-7', 'Casetta')], spaceBase: [entry('s-7', 'Casetta')] });
  await pass.run();
  assert.deepEqual(listIn(chrome), [{ syncId: 's-7', name: 'Casetta', icon: null, iconId: null }, { syncId: 'new-1', name: 'Work', icon: null, iconId: null }]);
  assert.equal(ids.syncIdOf('8'), 'new-1');
  assert.match(JSON.stringify(chrome.tree), /https:\/\/vivarcdi\.invalid\/space\/new-1/);
  names.icons = { '8': 'workspace_icon_3' };
  await pass.run();
  assert.equal(listIn(chrome)[1]?.icon, 'workspace_icon_3');
  assert.equal(spaceBase.get()?.[1]?.icon, 'workspace_icon_3');
  const writes = chrome.calls.length;
  await pass.run();
  assert.deepEqual(chrome.calls.slice(writes).filter((call) => /^(create|update|remove)/.test(call)), []);
});

test('merges workspaces by name on the first run', async () => {
  const { pass, ids, creator, chrome } = world({
    workspaces: { '7': 'Casetta', '8': 'Work' },
    links: {},
    spaceBase: null,
    spaces: [entry('s-A', 'Casetta'), entry('s-B', 'Riposino')],
  });
  await pass.run();
  assert.equal(ids.syncIdOf('7'), 's-A');
  assert.deepEqual(creator.calls, ['Riposino']);
  assert.deepEqual(listIn(chrome).map(({ name }) => name), ['Casetta', 'Riposino', 'Work']);
});

test('follows a rename from another computer', async () => {
  const { pass, renamer, names, base, spaceBase, chrome, tabs, creator } = world({
    tabs: [pinnedTab(1, 'mail')],
    store: { Casa: ['mail'] },
    spaces: [entry('s-7', 'Casa')],
    spaceBase: [entry('s-7', 'Casetta')],
    base: { Casetta: ['mail'] },
  });
  await pass.run();
  assert.deepEqual(renamer.calls, [['Casetta', 'Casa']]);
  assert.deepEqual(names.names, ['Casa']);
  assert.deepEqual(creator.calls, []);
  assert.deepEqual(listIn(chrome).map(({ name }) => name), ['Casa']);
  assert.deepEqual(spaceBase.get()?.map(({ name }) => name), ['Casa']);
  assert.deepEqual(base.get('Casa'), ['mail.example']);
  assert.deepEqual(tabs.tabCalls(), []);
});

test('keeps the local name and creates no second workspace when the rename cannot be done', async () => {
  const { pass, renamer, names, creator, chrome, sink, spaceBase, ids } = world({
    store: { Casa: ['mail'] },
    spaces: [entry('s-7', 'Casa')],
    spaceBase: [entry('s-7', 'Casetta')],
  });
  renamer.succeeds = false;
  await pass.run();
  await pass.run();
  assert.deepEqual(names.names, ['Casetta']);
  assert.deepEqual(creator.calls, []);
  assert.equal(ids.syncIdOf('7'), 's-7');
  assert.deepEqual(listIn(chrome).map(({ name }) => name), ['Casa']);
  assert.deepEqual(spaceBase.get()?.map(({ name }) => name), ['Casetta']);
  assert.equal(sink.warnings.length, 1);
});

test('renames the store entry and its folder after a rename here', async () => {
  const { pass, chrome, renamer, base } = world({
    tabs: [pinnedTab(1, 'mail')],
    store: { Casetta: ['mail'] },
    workspaces: { '7': 'Casa' },
    spaces: [entry('s-7', 'Casetta')],
    spaceBase: [entry('s-7', 'Casetta')],
    base: { Casetta: ['mail'] },
  });
  await pass.run();
  assert.deepEqual(renamer.calls, []);
  assert.deepEqual(listIn(chrome).map(({ name }) => name), ['Casa']);
  assert.deepEqual(pinnedIn(chrome, 'Casa'), ['mail']);
  assert.deepEqual(pinnedIn(chrome, 'Casetta'), []);
  assert.deepEqual(base.get('Casa'), ['mail.example']);
});

test('keeps a workspace deleted elsewhere', async () => {
  const { pass, names, tabs, chrome, ids, creator } = world({
    tabs: [pinnedTab(1, 'mail')],
    store: { Casetta: ['mail'] },
    workspaces: { '7': 'Casetta', '8': 'Work' },
    links: { '7': 's-7', '8': 's-8' },
    spaces: [entry('s-7', 'Casetta')],
    spaceBase: [entry('s-7', 'Casetta'), entry('s-8', 'Work')],
  });
  await pass.run();
  await pass.run();
  assert.deepEqual(names.names, ['Casetta', 'Work']);
  assert.deepEqual(tabs.tabCalls(), []);
  assert.deepEqual(creator.calls, []);
  assert.equal(ids.syncIdOf('8'), null);
  assert.deepEqual(listIn(chrome).map(({ name }) => name), ['Casetta']);
  names.workspaces = { '7': 'Casetta', '8': 'Lavoro' };
  await pass.run();
  assert.deepEqual(listIn(chrome).map(({ name }) => name), ['Casetta', 'Lavoro']);
});

test('removes a workspace deleted here from the store only', async () => {
  const { pass, chrome, creator } = world({
    store: { Casetta: ['mail'], Work: ['docs'] },
    spaces: [entry('s-7', 'Casetta'), entry('s-8', 'Work')],
    spaceBase: [entry('s-7', 'Casetta'), entry('s-8', 'Work')],
  });
  await pass.run();
  assert.deepEqual(listIn(chrome).map(({ name }) => name), ['Casetta']);
  assert.deepEqual(pinnedIn(chrome, 'Work'), ['docs']);
  assert.deepEqual(creator.calls, []);
});

test('does not touch the list when Vivaldi lists no workspace', async () => {
  const { pass, chrome, names } = world({ spaces: [entry('s-7', 'Casetta')] });
  names.workspaces = {};
  await pass.run();
  assert.deepEqual(listIn(chrome).map(({ name }) => name), ['Casetta']);
});

test('names a workspace it cannot create', async () => {
  const { pass, announced, creator, storage, spaceBase } = world({ spaces: [entry('s-7', 'Casetta'), entry('s-x', 'Work')] });
  creator.result = 'failed';
  await pass.run();
  await pass.run();
  assert.equal(announced.length, 1);
  assert.match(announced[0] ?? '', /Work/);
  assert.doesNotMatch(announced[0] ?? '', /Casetta/);
  assert.equal(storage.getItem('vivarcdi.sync.announced'), JSON.stringify(['Work']));
  assert.deepEqual(spaceBase.get()?.map(({ syncId }) => syncId), ['s-7']);
});

test('asks for another pass when it is not a quiet moment', async () => {
  const { pass, announced, creator, retries } = world({ spaces: [entry('s-7', 'Casetta'), entry('s-x', 'Work')] });
  creator.result = 'deferred';
  await pass.run();
  assert.equal(retries.length, 1);
  assert.deepEqual(announced, []);
});

test('names a workspace missing here once', async () => {
  const { pass, announced, tabs, creator, names, ids } = world({ store: { Casetta: ['mail'], Work: ['docs'] }, spaces: [entry('s-7', 'Casetta'), entry('s-x', 'Work')] });
  creator.result = 'failed';
  await pass.run();
  await pass.run();
  assert.equal(announced.length, 1);
  assert.equal(tabs.tabCalls().filter(([name]) => name === 'create').length, 1);
  names.workspaces = { ...names.workspaces, '8': 'Work' };
  await pass.run();
  assert.equal(announced.length, 1);
  assert.equal(ids.syncIdOf('8'), 's-x');
  assert.equal(tabs.tabCalls().filter(([name]) => name === 'create').length, 2);
});
