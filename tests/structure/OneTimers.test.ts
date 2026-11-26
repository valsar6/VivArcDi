import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SRC = join(ROOT, 'src');
const OWNER = join('src', 'core', 'support', 'Timers.ts');
const SYSTEM_CLEAR = /\bclear\s*:\s*\([^)]*\)[^=]*=>\s*clearTimeout\(/;

const typescriptFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return typescriptFiles(path);
    }
    return entry.name.endsWith('.ts') ? [path] : [];
  });

test('only Timers defines the system timers', () => {
  const offending = typescriptFiles(SRC)
    .map((file) => relative(ROOT, file))
    .filter((file) => file !== OWNER && SYSTEM_CLEAR.test(readFileSync(join(ROOT, file), 'utf8')));
  assert.deepEqual(offending, []);
});
