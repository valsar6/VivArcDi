import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ResourceLoader } from '../../src/core/ResourceLoader.js';

const fetchOf =
  (files: Record<string, string>) =>
  async (input: string): Promise<Pick<Response, 'ok' | 'status' | 'json' | 'text'>> => {
    const body = files[input];
    return {
      ok: body !== undefined,
      status: body === undefined ? 404 : 200,
      json: async () => JSON.parse(body ?? 'null') as unknown,
      text: async () => body ?? '',
    };
  };

test('ResourceLoader reads JSON and text files of the payload', async () => {
  const loader = new ResourceLoader(
    'chrome-extension://v/vivarcdi/',
    fetchOf({
      'chrome-extension://v/vivarcdi/config.json': '{"a":1}',
      'chrome-extension://v/vivarcdi/page/peek-links.js': 'code',
    }),
  );
  assert.deepEqual(await loader.json('config.json'), { a: 1 });
  assert.equal(await loader.text('page/peek-links.js'), 'code');
  await assert.rejects(loader.text('missing.js'), /Cannot load missing.js: HTTP 404/);
});
