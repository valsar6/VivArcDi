import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LinkLabels } from '../../../src/core/browser/LinkLabels.js';
import type { LinkLabel } from '../../../src/core/browser/LinkLabels.js';
import type { CommandItem, MenuItem } from '../../../src/core/dom/ContextMenu.js';
import type { ToastKind } from '../../../src/core/dom/Toast.js';
import { Logger } from '../../../src/core/support/Logger.js';
import type { PickOptions, PickResult } from '../../../src/shared/icons/IconPicker.js';
import type { EditOptions, EditTarget } from '../../../src/shared/links/InPlaceEditor.js';
import { LabelCommands } from '../../../src/shared/links/LabelCommands.js';
import type { LabelCommandsDependencies } from '../../../src/shared/links/LabelCommands.js';
import { CHANGE_ICON_LABEL, RENAME_LABEL } from '../../../src/shared/tabs/CommandLabels.js';
import { SilentSink } from '../../loader/fakes.js';
import { bookmarkTree, folder, link, WritableChrome } from '../../modules/folders/fakes.js';
import { MemoryStorage, settle } from '../../modules/reopen/fakes.js';

const URL = 'https://a.example/';
const KEY = 'bookmark:22';
const TARGET: EditTarget = { anchor: {} as HTMLElement, covers: true };

interface Setup {
  commands: LabelCommands;
  labels: LinkLabels;
  chrome: WritableChrome;
  sink: SilentSink;
  toasts: Array<[string, ToastKind | undefined]>;
  edits: EditOptions[];
  picks: PickOptions[];
  pages: string[];
}

interface Options {
  edits?: Array<string | null>;
  picks?: Array<PickResult | null>;
  favicons?: Array<string | null>;
  outcomes?: Array<'saved' | 'failed' | 'memory'>;
  targetMissing?: boolean;
}

function make(options: Options = {}): Setup {
  const edits = (options.edits ?? []).slice();
  const picks = (options.picks ?? []).slice();
  const favicons = (options.favicons ?? []).slice();
  const outcomes = (options.outcomes ?? []).slice();
  const sink = new SilentSink();
  const chrome = new WritableChrome(bookmarkTree([folder('20', 'Favorites', [link('22', 'Long title', URL)])]));
  const labels = LinkLabels.of(new MemoryStorage(), new Logger('test', sink));
  const toasts: Array<[string, ToastKind | undefined]> = [];
  const recorded: EditOptions[] = [];
  const picked: PickOptions[] = [];
  const pages: string[] = [];
  const failure = (): 'saved' | 'failed' | 'memory' => outcomes.shift() ?? 'saved';
  const dependencies: LabelCommandsDependencies = {
    labels: {
      get: (key): LinkLabel | undefined => labels.get(key),
      set: async (key, change, setOptions): Promise<'saved' | 'failed' | 'memory'> => {
        const outcome = failure();
        if (outcome === 'failed') {
          return outcome;
        }
        return labels.set(key, change, setOptions);
      },
      clear: async (key): Promise<'saved' | 'failed' | 'memory'> => {
        const outcome = failure();
        return outcome === 'failed' ? outcome : labels.clear(key);
      },
    },
    editor: {
      edit: async (editOptions): Promise<string | null> => {
        recorded.push(editOptions);
        return edits.shift() ?? null;
      },
    },
    picker: {
      pick: async (pickOptions): Promise<PickResult | null> => {
        picked.push(pickOptions);
        return picks.shift() ?? null;
      },
    },
    favicon: { read: async (): Promise<string | null> => favicons.shift() ?? null },
    keyOf: (): string => KEY,
    target: (): EditTarget | null => (options.targetMissing === true ? null : TARGET),
    textOf: (): string => 'Long title',
    pageOf: async (id): Promise<{ url: string } | null> => {
      pages.push(id);
      const { url } = await chrome.writer.get(id);
      return url === undefined ? null : { url };
    },
    notify: (text, kind): void => void toasts.push([text, kind]),
    logger: new Logger('test', sink),
  };
  return { commands: new LabelCommands(dependencies), labels, chrome, sink, toasts, edits: recorded, picks: picked, pages };
}

const item = (items: MenuItem[], label: string): CommandItem => items.find((entry): entry is CommandItem => 'run' in entry && entry.label === label) as CommandItem;

test('rename keeps the url', async () => {
  const { commands, chrome, labels } = make({ edits: ['Short'], picks: [{ icon: { emoji: '⭐' } }] });
  item(commands.items('22'), RENAME_LABEL).run();
  await settle();
  item(commands.items('22'), CHANGE_ICON_LABEL).run();
  await settle();
  assert.deepEqual(chrome.calls, []);
  assert.equal((await chrome.writer.get('22')).url, URL);
  assert.deepEqual(labels.get(KEY), { name: 'Short', icon: { emoji: '⭐' } });
});

test('renames a saved tab in place', async () => {
  const entered = make({ edits: ['Short'] });
  item(entered.commands.items('22'), RENAME_LABEL).run();
  await settle();
  assert.deepEqual(entered.edits, [{ target: TARGET, value: 'Long title', label: 'Name' }]);
  assert.deepEqual(entered.labels.get(KEY), { name: 'Short' });

  const escaped = make({ edits: [null] });
  item(escaped.commands.items('22'), RENAME_LABEL).run();
  await settle();
  assert.equal(escaped.labels.get(KEY), undefined);

  const emptied = make({ edits: [''] });
  item(emptied.commands.items('22'), RENAME_LABEL).run();
  await settle();
  assert.equal(emptied.labels.get(KEY), undefined);
});

test('refreshes the favicon of a saved tab', async () => {
  const refreshed = make({ picks: [{ icon: { emoji: '⭐' } }, { refresh: true }], favicons: ['https://a.example/new.ico'] });
  item(refreshed.commands.items('22'), CHANGE_ICON_LABEL).run();
  await settle();
  item(refreshed.commands.items('22'), CHANGE_ICON_LABEL).run();
  await settle();
  assert.deepEqual(refreshed.pages, ['22']);
  assert.deepEqual(refreshed.labels.get(KEY), { favicon: 'https://a.example/new.ico' });
  assert.deepEqual(refreshed.toasts, []);

  const failed = make({ picks: [{ refresh: true }], favicons: [null] });
  item(failed.commands.items('22'), CHANGE_ICON_LABEL).run();
  await settle();
  assert.deepEqual(failed.toasts, [['Could not read the favicon', 'error']]);
  assert.equal(failed.labels.get(KEY), undefined);
});

test('the choices of the picker reach the label store', async () => {
  const emoji = make({ picks: [{ icon: { emoji: '💬' } }] });
  item(emoji.commands.items('22'), CHANGE_ICON_LABEL).run();
  await settle();
  assert.deepEqual(emoji.labels.get(KEY), { icon: { emoji: '💬' } });

  const symbol = make({ picks: [{ icon: { symbol: 'star' } }] });
  item(symbol.commands.items('22'), CHANGE_ICON_LABEL).run();
  await settle();
  assert.deepEqual(symbol.labels.get(KEY), { icon: { symbol: 'star' } });

  const reset = make({ picks: [{ reset: true }] });
  await reset.labels.set(KEY, { name: 'Short', icon: { emoji: '💬' }, favicon: 'https://a.example/new.ico' });
  item(reset.commands.items('22'), CHANGE_ICON_LABEL).run();
  await settle();
  assert.equal(reset.labels.get(KEY), undefined);
  assert.equal(reset.picks[0]?.refresh, true);
});

test('a failed save shows the error toast', async () => {
  const name = make({ edits: ['Short'], outcomes: ['failed'] });
  item(name.commands.items('22'), RENAME_LABEL).run();
  await settle();
  assert.deepEqual(name.toasts, [['Could not save the name', 'error']]);

  const icon = make({ picks: [{ icon: { emoji: '💬' } }], outcomes: ['failed'] });
  item(icon.commands.items('22'), CHANGE_ICON_LABEL).run();
  await settle();
  assert.deepEqual(icon.toasts, [['Could not save the icon', 'error']]);
});

test('does nothing and logs once when the row is not on screen', async () => {
  const { commands, labels, sink, edits } = make({ targetMissing: true, edits: ['Short'] });
  item(commands.items('22'), RENAME_LABEL).run();
  item(commands.items('22'), CHANGE_ICON_LABEL).run();
  await settle();
  assert.deepEqual(edits, []);
  assert.equal(labels.get(KEY), undefined);
  assert.equal(sink.lines.filter((line) => line[0] === 'warn').length, 1);
});
