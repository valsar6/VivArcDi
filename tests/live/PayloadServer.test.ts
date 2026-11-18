import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PayloadServer } from '../../scripts/live/PayloadServer.js';
import { tempDir } from './fakes.js';

const BUILD = { vivarcdiVersion: '0.59.0', vivaldiVersion: '8.3.4191.44', payloadFingerprint: 'live' };

async function served(): Promise<{ server: PayloadServer; root: string }> {
  const root = tempDir();
  const dist = join(root, 'dist');
  mkdirSync(join(dist, 'core'), { recursive: true });
  writeFileSync(join(dist, 'loader.js'), "import './core/VivArcDi.js';\n");
  writeFileSync(join(dist, 'config.json'), '{"modules":{}}');
  writeFileSync(join(root, 'secret.txt'), 'outside dist');
  return { server: await PayloadServer.start(dist, BUILD), root };
}

test('serves the payload files with their types to any origin, from 127.0.0.1 only', async () => {
  const { server } = await served();

  const loader = await fetch(new URL('loader.js', server.url));

  assert.match(server.url, /^http:\/\/127\.0\.0\.1:\d+\/$/);
  assert.equal(loader.status, 200);
  assert.equal(loader.headers.get('content-type'), 'text/javascript');
  assert.equal(loader.headers.get('access-control-allow-origin'), '*');
  assert.equal(await loader.text(), "import './core/VivArcDi.js';\n");
  await server.close();
});

test('answers build.json with the facts of the lab run', async () => {
  const { server } = await served();

  const build = (await (await fetch(new URL('build.json', server.url))).json()) as object;

  assert.deepEqual(build, BUILD);
  await server.close();
});

test('refuses missing files and paths outside dist', async () => {
  const { server } = await served();

  assert.equal((await fetch(new URL('missing.js', server.url))).status, 404);
  assert.equal((await fetch(`${server.url}..%2Fsecret.txt`)).status, 404);
  await server.close();
});
