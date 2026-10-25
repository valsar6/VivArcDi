import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VersionSources } from '../../scripts/release/VersionSources.js';

const sources = (manifest: string, installer: string): VersionSources =>
  new VersionSources((path) =>
    path === 'package.json'
      ? JSON.stringify({ version: manifest })
      : `"""Docstring."""\n\n__version__ = "${installer}"\n`,
  );

test('version is read when package.json and the installer agree', () => {
  assert.equal(sources('0.2.0', '0.2.0').version().toString(), '0.2.0');
});

test('version fails when package.json and the installer disagree', () => {
  assert.throws(() => sources('0.3.0', '0.2.0').version(), /update both/);
});

test('the repository versions agree', () => {
  assert.doesNotThrow(() => VersionSources.fromDisk(process.cwd()).version());
});
