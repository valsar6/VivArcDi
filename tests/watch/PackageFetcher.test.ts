import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { PackageEntry } from '../../scripts/watch/AptIndex.js';
import { PackageFetcher } from '../../scripts/watch/PackageFetcher.js';

const DEB = Buffer.from('a fake debian package');
const folder = mkdtempSync(join(tmpdir(), 'vivarcdi-watch-test-'));
after(() => rmSync(folder, { recursive: true, force: true }));

function entry(sha256: string): PackageEntry {
  return { package: 'vivaldi-snapshot', version: '8.4.4226.3-1', filename: 'pool/main/v_8.4_amd64.deb', sha256, depends: [] };
}

test('downloads, checks and unpacks a package into a root folder', async () => {
  const asked: string[] = [];
  const unpacked: Array<[string, string]> = [];
  const fetcher = new PackageFetcher(
    async (url) => {
      asked.push(url);
      return new Response(DEB);
    },
    async (deb, root) => void unpacked.push([deb, root]),
  );

  const root = await fetcher.fetch(entry(createHash('sha256').update(DEB).digest('hex')), folder);

  assert.deepEqual(asked, ['https://repo.vivaldi.com/archive/deb/pool/main/v_8.4_amd64.deb']);
  assert.equal(root, join(folder, 'root'));
  assert.deepEqual(unpacked, [[join(folder, 'v_8.4_amd64.deb'), root]]);
  assert.deepEqual(readFileSync(join(folder, 'v_8.4_amd64.deb')), DEB);
});

test('refuses a package whose checksum differs', async () => {
  const unpacked: string[] = [];
  const fetcher = new PackageFetcher(async () => new Response(DEB), async (deb) => void unpacked.push(deb));
  const empty = mkdtempSync(join(tmpdir(), 'vivarcdi-watch-test-'));

  await assert.rejects(fetcher.fetch(entry('0'.repeat(64)), empty), /has SHA256 [0-9a-f]{64}, the index lists 0{64}/);
  assert.deepEqual(unpacked, []);
  assert.equal(existsSync(join(empty, 'v_8.4_amd64.deb')), false);
  rmSync(empty, { recursive: true, force: true });
});

test('reports a failed download', async () => {
  const fetcher = new PackageFetcher(async () => new Response('', { status: 404 }), async () => undefined);

  await assert.rejects(fetcher.fetch(entry('0'.repeat(64)), folder), /HTTP 404/);
});
