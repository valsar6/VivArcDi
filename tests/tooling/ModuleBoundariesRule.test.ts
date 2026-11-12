import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import moduleBoundaries from '../../tools/eslint/module-boundaries.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OTHER_MODULE = 'otherModule';
const SHARED_TO_MODULE = 'sharedToModule';
const CORE_TO_OUTER = 'coreToOuter';

const linter = new Linter({ cwd: ROOT });

const messageIdsFor = (filename: string, code: string): Array<string | null> => {
  const messages = linter.verify(
    code,
    [
      {
        files: ['**/*.ts'],
        languageOptions: { parser: tseslint.parser },
        plugins: { local: moduleBoundaries },
        rules: { 'local/module-boundaries': 'error' },
      },
    ],
    { filename: `${ROOT}${filename}` },
  );
  return messages.map((message) => message.messageId ?? message.message);
};

test('rule reports an import into another module', () => {
  const fromModule = 'src/modules/today/A.ts';
  const statements = [
    "import { X } from '../tabs/X.js';",
    "import type { X } from '../tabs/X.js';",
    "export { X } from '../tabs/X.js';",
    "export * from '../tabs/X.js';",
    "const loaded = import('../tabs/X.js');",
  ];
  for (const statement of statements) {
    assert.deepEqual(messageIdsFor(fromModule, statement), [OTHER_MODULE], statement);
  }
  assert.deepEqual(messageIdsFor(fromModule, "import { X } from '../tabs/view/X.js';"), [OTHER_MODULE]);
  const fromShared = 'src/shared/links/A.ts';
  const sharedStatements = [
    "import { X } from '../../modules/today/X.js';",
    "import type { X } from '../../modules/today/X.js';",
    "export { X } from '../../modules/today/X.js';",
    "export * from '../../modules/today/X.js';",
    "const loaded = import('../../modules/today/X.js');",
  ];
  for (const statement of sharedStatements) {
    assert.deepEqual(messageIdsFor(fromShared, statement), [SHARED_TO_MODULE], statement);
  }
});

test('rule accepts imports from core, shared and the same module', () => {
  const fromModule = 'src/modules/today/A.ts';
  const statements = [
    "import { X } from '../../core/X.js';",
    "import { X } from '../../shared/links/X.js';",
    "import { X } from './X.js';",
    "import { X } from './view/X.js';",
    "import { X } from 'some-package';",
    "import type { X } from 'node:path';",
    "export * from './view/X.js';",
    "const loaded = import('./view/X.js');",
  ];
  for (const statement of statements) {
    assert.deepEqual(messageIdsFor(fromModule, statement), [], statement);
  }
  const registry = "import { BookmarkFolders } from './folders/BookmarkFolders.js';";
  assert.deepEqual(messageIdsFor('src/modules/index.ts', registry), []);
  assert.deepEqual(messageIdsFor('src/shared/links/A.ts', "import { X } from '../../core/X.js';"), []);
});

test('rule reports an import from core into shared or a module', () => {
  const fromCore = 'src/core/tabs/A.ts';
  const statements = [
    "import { X } from '../../shared/links/X.js';",
    "import type { X } from '../../shared/links/X.js';",
    "export { X } from '../../modules/today/X.js';",
    "export * from '../../modules/today/view/X.js';",
    "const loaded = import('../../modules/index.js');",
  ];
  for (const statement of statements) {
    assert.deepEqual(messageIdsFor(fromCore, statement), [CORE_TO_OUTER], statement);
  }
});

test('rule accepts imports from core into core', () => {
  const fromCore = 'src/core/tabs/A.ts';
  const statements = [
    "import { X } from './X.js';",
    "import type { X } from '../browser/X.js';",
    "export { X } from '../browser/bookmarks/X.js';",
    "export * from '../dom/X.js';",
    "const loaded = import('../support/X.js');",
    "import { X } from 'some-package';",
  ];
  for (const statement of statements) {
    assert.deepEqual(messageIdsFor(fromCore, statement), [], statement);
  }
});
