import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AddressKey } from '../../../src/modules/reopen/AddressKey.js';

test('matches addresses that differ only by www, slash, query or fragment', () => {
  const key = AddressKey.from('https://mahjongsoul.game.yo-star.com/');
  assert.equal(key, 'mahjongsoul.game.yo-star.com');
  assert.equal(AddressKey.from('http://www.mahjongsoul.game.yo-star.com/?lang=it#top'), key);
  assert.equal(AddressKey.from('https://mail.google.com/mail/u/0/'), AddressKey.from('https://www.mail.google.com/mail/u/0?tab=rm#inbox'));
});

test('does not match different hosts or paths', () => {
  assert.notEqual(AddressKey.from('https://mail.google.com/'), AddressKey.from('https://docs.google.com/'));
  assert.notEqual(AddressKey.from('https://example.com/a'), AddressKey.from('https://example.com/b'));
  assert.notEqual(AddressKey.from('https://example.com/'), AddressKey.from('https://example.com:8080/'));
});

test('address key ignores addresses that are not web pages', () => {
  assert.equal(AddressKey.from('vivaldi://settings'), null);
  assert.equal(AddressKey.from('not a url'), null);
  assert.equal(AddressKey.from(undefined), null);
});
