import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ActivityStamps } from '../../../src/modules/today/ActivityStamps.js';
import { silentLogger } from '../reopen/fakes.js';
import { NOW, TodayTabs } from './fakes.js';

test('stamps only tabs of its own window before it knows the window', async () => {
  const tabs = new TodayTabs([{ id: 1 }, { id: 2, windowId: 2 }]);
  const stamps = new ActivityStamps(tabs, (): number => NOW, silentLogger());
  await stamps.start();
  tabs.open({ id: 3, windowId: 1 });
  tabs.open({ id: 4, windowId: 2 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(tabs.lastActiveOf(3), NOW);
  assert.equal(tabs.lastActiveOf(4), undefined);
  stamps.stop();
});
