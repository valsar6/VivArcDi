import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StoredFormat, StoredRead, VersionedStorage } from '../../src/core/browser/StoredFormat.js';
import type { SaveOutcome } from '../../src/core/browser/SavingStorage.js';
import { LinkLabels } from '../../src/core/browser/LinkLabels.js';
import { LastOpenedStore } from '../../src/shared/links/LastOpenedStore.js';
import { CreatedLinks } from '../../src/modules/folders/favoritelinks/CreatedLinks.js';
import { OpenFolders } from '../../src/modules/folders/tree/OpenFolders.js';
import { GithubConnection } from '../../src/modules/livefolders/GithubConnection.js';
import { LiveFolderStore } from '../../src/modules/livefolders/LiveFolderStore.js';
import { LittleArcRegistry } from '../../src/modules/littlearc/LittleArcRegistry.js';
import { ArchiveStore } from '../../src/modules/today/ArchiveStore.js';
import { MissingSpaces } from '../../src/modules/workspacesync/MissingSpaces.js';
import { SpaceBase } from '../../src/modules/workspacesync/SpaceBase.js';
import { SpaceIds } from '../../src/modules/workspacesync/SpaceIds.js';
import { SyncBase } from '../../src/modules/workspacesync/SyncBase.js';
import { silentLogger } from '../modules/reopen/fakes.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ARCHIVE_LIMIT = 10;

class ReadLog implements VersionedStorage {
  public readonly mode = 'memory';
  public readonly keys: string[] = [];
  public readonly direct: string[] = [];

  public getItem(key: string): string | null {
    this.direct.push(key);
    return null;
  }

  public setItem(): void {
    return undefined;
  }

  public async save(): Promise<SaveOutcome> {
    return 'memory';
  }

  public read<T>(key: string, format: StoredFormat<T>): StoredRead<T> {
    this.keys.push(key);
    return format.decode(null);
  }
}

const typescriptFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return typescriptFiles(path);
    }
    return entry.name.endsWith('.ts') ? [path] : [];
  });

const readEveryStore = (log: ReadLog): void => {
  const logger = silentLogger();
  void new ArchiveStore(log, ARCHIVE_LIMIT).entries;
  void new LiveFolderStore(log, logger).workspaces;
  void new GithubConnection({ storage: log, logger, send: (): Promise<never> => Promise.reject(new Error('unused')) }).token;
  new LastOpenedStore(log, logger).load(new Date());
  LinkLabels.of(log, logger).all();
  const open = new OpenFolders(log, logger);
  open.load();
  open.useWorkspace('w1');
  new CreatedLinks(log).has('1');
  new LittleArcRegistry(log).has(1);
  new SyncBase(log).get('Work');
  new SpaceBase(log).get();
  new SpaceIds(log).syncIdOf('w1');
  new MissingSpaces(log, () => undefined).announce([]);
};

test('every stored JSON key reads through the shared reader', () => {
  const log = new ReadLog();
  readEveryStore(log);
  assert.deepEqual(log.direct, []);
  const expected = [
    'vivarcdi.archive',
    'vivarcdi.liveFolders',
    'vivarcdi.liveFolders.github',
    'vivarcdi.lastOpened',
    'vivarcdi.labels',
    'vivarcdi.openFolders',
    'vivarcdi.openFolders.w1',
    'vivarcdi.createdLinks',
    'vivarcdi.little-arc.windows',
    'vivarcdi.sync.base.Work',
    'vivarcdi.sync.base.spaces',
    'vivarcdi.sync.spaceIds',
    'vivarcdi.sync.announced',
  ];
  for (const key of expected) {
    assert.ok(log.keys.includes(key), `${key} was not read through the reader`);
  }
  const offenders = ['src/modules', 'src/shared']
    .flatMap((folder) => typescriptFiles(join(ROOT, folder)))
    .filter((file) => {
      const text = readFileSync(file, 'utf8');
      return text.includes('getItem(') && text.includes('JSON.parse(');
    })
    .map((file) => relative(ROOT, file));
  assert.deepEqual(offenders, []);
});
