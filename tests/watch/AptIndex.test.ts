import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AptIndex } from '../../scripts/watch/AptIndex.js';
import { compareDebianVersions, upstreamVersion } from '../../scripts/watch/DebianVersion.js';

const PACKAGES = readFileSync(join(import.meta.dirname, 'fixtures', 'Packages'), 'utf8');

test('picks the newest package of a channel from the apt index', () => {
  const index = new AptIndex(PACKAGES);

  assert.equal(index.newest('vivaldi-snapshot').version, '8.4.4226.10-1');
  assert.equal(index.newest('vivaldi-stable').version, '8.3.4191.44-1');
  assert.equal(index.newest('vivaldi-stable').filename, 'pool/main/vivaldi-stable_8.3.4191.44-1_amd64.deb');
  assert.throws(() => index.newest('vivaldi-beta'), /lists no vivaldi-beta/);
});

test('reads checksums and dependency alternatives without version constraints', () => {
  const entry = new AptIndex(PACKAGES).newest('vivaldi-snapshot');
  const first = new AptIndex(PACKAGES.split('\n\n')[0] ?? '').newest('vivaldi-snapshot');

  assert.equal(entry.sha256, '2222222222222222222222222222222222222222222222222222222222222222');
  assert.deepEqual(first.depends, [
    ['ca-certificates'],
    ['libasound2'],
    ['libcurl3-gnutls', 'libcurl3-nss', 'libcurl4'],
    ['libgtk-3-0', 'libgtk-4-1'],
    ['libnss3'],
  ]);
});

test('compares Debian versions as dpkg does', () => {
  const ascending = ['8.4.4226.3-1', '8.4.4226.9-1', '8.4.4226.10-1', '8.4.4226.10-2', '1:0.1-1'];
  const shuffled = [...ascending].reverse();

  assert.deepEqual(shuffled.sort(compareDebianVersions), ascending);
  assert.ok(compareDebianVersions('1.0~rc1-1', '1.0-1') < 0);
  assert.ok(compareDebianVersions('1.0a-1', '1.0-1') > 0);
  assert.equal(compareDebianVersions('8.4.4226.3-1', '8.4.4226.3-1'), 0);
  assert.equal(upstreamVersion('8.4.4226.3-1'), '8.4.4226.3');
});

test('downloads the index from the repository', async () => {
  const asked: string[] = [];
  const index = await AptIndex.download(async (url) => {
    asked.push(url);
    return new Response(PACKAGES);
  });

  assert.deepEqual(asked, ['https://repo.vivaldi.com/archive/deb/dists/stable/main/binary-amd64/Packages']);
  assert.equal(index.newest('vivaldi-snapshot').version, '8.4.4226.10-1');
  await assert.rejects(AptIndex.download(async () => new Response('', { status: 503 })), /HTTP 503/);
});
