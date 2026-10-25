import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LinkClassifier } from '../../../src/modules/peek/LinkClassifier.js';
import type { LinkClick, PeekTriggers } from '../../../src/modules/peek/LinkClassifier.js';

const allOn: PeekTriggers = { shiftClick: true, pinnedCrossSite: true, anyCrossSite: true };
const defaults: PeekTriggers = { shiftClick: true, pinnedCrossSite: true, anyCrossSite: false };

function click(change: Partial<LinkClick> = {}): LinkClick {
  return {
    button: 0,
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    href: 'https://www.youtube.com/watch',
    target: '',
    pageUrl: 'https://mail.google.com/inbox',
    pinned: false,
    ...change,
  };
}

const peeks = (triggers: PeekTriggers, change: Partial<LinkClick>): boolean =>
  new LinkClassifier(triggers).classify(click(change)).peek;

test('link classifier ignores disabled triggers', () => {
  const none: PeekTriggers = { shiftClick: false, pinnedCrossSite: false, anyCrossSite: false };
  assert.equal(peeks(none, { shiftKey: true }), false);
  assert.equal(peeks(none, { pinned: true }), false);
  assert.equal(peeks(none, {}), false);
  assert.equal(peeks({ ...allOn, shiftClick: false }, { shiftKey: true, href: 'https://mail.google.com/x' }), false);
  assert.equal(peeks({ ...allOn, pinnedCrossSite: false }, { pinned: true }), false);
});

test('link classifier leaves plain clicks in ordinary tabs by default', () => {
  assert.equal(peeks(defaults, {}), false);
  assert.equal(peeks(allOn, {}), true);
});

test('link classifier opens shift clicks in Peek instead of a new window', () => {
  const decision = new LinkClassifier(defaults).classify(click({ shiftKey: true, href: 'https://mail.google.com/x' }));
  assert.deepEqual(decision, { peek: true, disposition: 'new-window' });
});

test('link classifier opens links to another site in pinned tabs', () => {
  assert.equal(peeks(defaults, { pinned: true }), true);
  assert.equal(peeks(defaults, { pinned: true, href: 'https://docs.google.com/d' }), false);
});

test('link classifier leaves other buttons, modifiers and non-web links to Vivaldi', () => {
  assert.equal(peeks(allOn, { button: 1, shiftKey: true }), false);
  assert.equal(peeks(allOn, { metaKey: true, pinned: true }), false);
  assert.equal(peeks(allOn, { ctrlKey: true, shiftKey: true }), false);
  assert.equal(peeks(allOn, { altKey: true, pinned: true }), false);
  assert.equal(peeks(allOn, { shiftKey: true, href: 'mailto:someone@example.com' }), false);
});

test('link classifier reports what Vivaldi would have done', () => {
  const classifier = new LinkClassifier(defaults);
  assert.equal(classifier.classify(click({ pinned: true, target: '_blank' })).disposition, 'new-tab');
  assert.equal(classifier.classify(click({ pinned: true })).disposition, 'same-tab');
});
