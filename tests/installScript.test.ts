import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

interface Package {
  scripts: Record<string, string>;
}

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const pkg = JSON.parse(readFileSync(`${ROOT}package.json`, 'utf8')) as Package;
const source = readFileSync(`${ROOT}scripts/install-payload.mjs`, 'utf8');

test('npm install command builds before deploying', () => {
  assert.equal(pkg.scripts.install, 'node scripts/install-payload.mjs');
  assert.ok(source.indexOf("spawnSync('make', ['build']") < source.indexOf("['installer', 'install']"));
});

test('npm install command skips npm lifecycle invocations', () => {
  assert.ok(source.includes('process.env.npm_command'));
  assert.ok(source.includes("['run', 'run-script']"));
});

test('npm install command falls back from python3 to python', () => {
  assert.ok(source.includes("'python3'"));
  assert.ok(source.includes("'python'"));
});
