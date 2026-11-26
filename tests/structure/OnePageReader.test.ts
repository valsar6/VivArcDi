import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SRC = join(ROOT, 'src');
const READER = 'src/shared/messages/PageMessage.ts';

function typescriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return typescriptFiles(path);
    }
    return path.endsWith('.ts') ? [path] : [];
  });
}

test('only PageMessage reads a console line', () => {
  const offending = typescriptFiles(SRC)
    .map((file) => relative(ROOT, file))
    .filter((file) => file !== READER)
    .filter((file) => /\bfromConsole\b/.test(readFileSync(join(ROOT, file), 'utf8')));
  assert.deepEqual(offending, []);
});
