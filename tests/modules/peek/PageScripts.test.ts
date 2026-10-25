import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PageScripts } from '../../../src/modules/peek/PageScripts.js';
import { FakeLoader } from '../../loader/fakes.js';

test('page scripts call the bundle globals after the bundles', async () => {
  const scripts = await PageScripts.load(new FakeLoader({ 'page/peek-links.js': 'L', 'page/peek-keys.js': 'K' }));
  const policy = { triggers: { shiftClick: true, pinnedCrossSite: true, anyCrossSite: false }, pinned: false, tabId: 2, token: 't' };
  assert.equal(scripts.installLinks(policy), `L\nVivArcDiPeekLinks.install(${JSON.stringify(policy)});`);
  assert.equal(scripts.uninstallLinks(), 'globalThis.VivArcDiPeekLinks?.uninstall();');
  assert.equal(scripts.installKeys('t'), 'K\nVivArcDiPeekKeys.install("t");');
});
