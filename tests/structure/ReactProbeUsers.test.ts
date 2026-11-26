import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULES = fileURLToPath(new URL('../../src/modules', import.meta.url));

const typescriptFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? typescriptFiles(path) : entry.name.endsWith('.ts') ? [path] : [];
  });

const foldersWith = (text: string): Set<string> =>
  new Set(
    readdirSync(MODULES, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .filter((entry) => typescriptFiles(join(MODULES, entry.name)).some((file) => readFileSync(file, 'utf8').includes(text)))
      .map((entry) => entry.name),
  );

test('every module that builds ReactInternals registers the React probe', () => {
  const users = foldersWith('new ReactInternals(');
  const registrars = foldersWith('registerReactProbe(');
  assert.ok(users.size > 0);
  assert.deepEqual([...users].filter((folder) => !registrars.has(folder)), []);
});
