import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commandFor } from '../../../src/modules/peek/PeekKeyMap.js';
import { PeekKeys } from '../../../src/modules/peek/PeekKeys.js';
import type { PeekCommand } from '../../../src/modules/peek/PeekMessage.js';
import { FakeDocument } from './fakes.js';

const key = (value: string, mod = false): Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey'> => ({
  key: value,
  metaKey: mod,
  ctrlKey: false,
});

test('peek keys map Esc and Cmd or Ctrl with W and O', () => {
  assert.equal(commandFor(key('Escape')), 'close');
  assert.equal(commandFor(key('w', true)), 'close');
  assert.equal(commandFor({ key: 'W', metaKey: false, ctrlKey: true }), 'close');
  assert.equal(commandFor(key('o', true)), 'expand');
  assert.equal(commandFor(key('w')), null);
  assert.equal(commandFor(key('t', true)), null);
});

test('peek keys act only while a Peek is open and stop Vivaldi from seeing them', () => {
  const document = new FakeDocument({});
  const commands: PeekCommand[] = [];
  let open = false;
  let stopped = 0;
  const keys = new PeekKeys(document as unknown as Document, () => open, (command) => commands.push(command));
  keys.attach();
  const press = (): void =>
    document.root.dispatch('keydown', {
      key: 'w',
      metaKey: true,
      ctrlKey: false,
      stopImmediatePropagation: () => {
        stopped += 1;
      },
    });
  press();
  open = true;
  press();
  assert.deepEqual(commands, ['close']);
  assert.equal(stopped, 1);
  keys.detach();
  assert.equal(document.root.listenerCount(), 0);
});
