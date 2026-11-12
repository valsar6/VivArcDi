import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GithubToken, TOKEN_PATH } from '../../../src/modules/livefolders/GithubToken.js';

const payload = (files: Record<string, string>): { text: (path: string) => Promise<string>; asked: string[] } => {
  const asked: string[] = [];
  return {
    asked,
    text: async (path: string): Promise<string> => {
      asked.push(path);
      const file = files[path];
      if (file === undefined) {
        throw new Error(`Cannot load ${path}: HTTP 404`);
      }
      return file;
    },
  };
};

test('reads the token that the installer stored with the payload', async () => {
  const source = payload({ [TOKEN_PATH]: ' ghp_abc \n' });
  assert.equal(await new GithubToken(source).read(), 'ghp_abc');
  assert.deepEqual(source.asked, ['secrets/github-token']);
});

test('reads the file again each time, so a token added later is used', async () => {
  const files: Record<string, string> = {};
  const token = new GithubToken(payload(files));
  assert.equal(await token.read(), null);
  files[TOKEN_PATH] = 'ghp_new';
  assert.equal(await token.read(), 'ghp_new');
});

test('has no token when the file is missing or empty', async () => {
  assert.equal(await new GithubToken(payload({})).read(), null);
  assert.equal(await new GithubToken(payload({ [TOKEN_PATH]: '  \n' })).read(), null);
});
