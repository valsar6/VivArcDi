import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StageRules } from '../../scripts/review-wait/StageRules.js';
import { changed } from './builders.js';

test('assigns a pull request to every spec whose folder it changes', () => {
  const files = changed(
    ['specs/037-versioned-storage/spec.md', 'MODIFIED'],
    ['specs/038-page-scripts/spec.md', 'MODIFIED'],
    ['specs/037-versioned-storage/tasks.md', 'MODIFIED'],
    ['specs/README.md', 'MODIFIED'],
  );

  assert.deepEqual(StageRules.classify(files).specs, ['037-versioned-storage', '038-page-scripts']);
  assert.deepEqual(StageRules.classify(changed(['CONTRIBUTING.md', 'MODIFIED'])).specs, []);
});

test('classifies a pull request by what it changes', () => {
  const draft = changed(['specs/049-review-wait/spec.md', 'ADDED'], ['specs/README.md', 'MODIFIED']);
  const design = changed(
    ['specs/049-review-wait/spec.md', 'MODIFIED'],
    ['specs/049-review-wait/design.md', 'ADDED'],
    ['specs/049-review-wait/tasks.md', 'ADDED'],
  );
  const code = changed(['scripts/review-wait/cli.ts', 'ADDED'], ['specs/049-review-wait/tasks.md', 'MODIFIED']);
  const installer = changed(['installer/vivarcdi/cli.py', 'MODIFIED']);

  assert.equal(StageRules.classify(draft).stage, 'spec');
  assert.equal(StageRules.classify(design).stage, 'design');
  assert.equal(StageRules.classify(code).stage, 'code');
  assert.equal(StageRules.classify(installer).stage, 'code');
  assert.equal(StageRules.classify(changed(['specs/049-review-wait/spec.md', 'MODIFIED'], ['docs/a.md', 'MODIFIED'])).stage, null);
});

test('classifies a status-only pull request as implemented', () => {
  const status = changed(['specs/048-github-token-refused/spec.md', 'MODIFIED'], ['specs/README.md', 'MODIFIED']);

  assert.equal(StageRules.classify(status).stage, 'implemented');
  assert.equal(StageRules.classify([]).stage, null);
});
