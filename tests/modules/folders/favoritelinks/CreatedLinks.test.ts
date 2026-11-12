import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CreatedLinks } from '../../../src/modules/folders/CreatedLinks.js';
import { MemoryStorage } from '../reopen/fakes.js';

test('remembers the bookmarks it created after a restart and forgets removed ones', () => {
  const storage = new MemoryStorage();
  const links = new CreatedLinks(storage);
  links.add('11');
  links.add('12');
  links.remove('11');
  links.remove('99');
  const restarted = new CreatedLinks(storage);
  assert.equal(restarted.has('11'), false);
  assert.equal(restarted.has('12'), true);
});

test('starts empty when the saved text is damaged', () => {
  const storage = new MemoryStorage();
  storage.setItem('vivarcdi.createdLinks', '{oops');
  assert.equal(new CreatedLinks(storage).has('1'), false);
  storage.setItem('vivarcdi.createdLinks', '[1, "2"]');
  assert.deepEqual([new CreatedLinks(storage).has('1'), new CreatedLinks(storage).has('2')], [false, true]);
});
