import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WorkspaceTabs } from '../../../src/core/WorkspaceTabs.js';
import { TabData } from '../../../src/core/TabData.js';
import { ActivityStamps } from '../../../src/modules/today/ActivityStamps.js';
import { silentLogger } from '../reopen/fakes.js';
import { TodayTabs } from '../today/fakes.js';

class RacingTabs extends TodayTabs {
  public override async get(tabId: number): Promise<chrome.tabs.Tab> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    return super.get(tabId);
  }

  public override async update(tabId: number, properties: Record<string, unknown>): Promise<chrome.tabs.Tab> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    return super.update(tabId, properties);
  }

  public override async create(properties: chrome.tabs.CreateProperties): Promise<chrome.tabs.Tab> {
    const tab = await super.create(properties);
    this.created.forEach((listener) => listener(tab));
    return tab;
  }
}

test('keeps the bookmark id when another module writes the tab at the same time', async () => {
  const tabs = new RacingTabs([{ id: 1, active: true }]);
  const stamps = new ActivityStamps(tabs, () => 42, silentLogger());
  await stamps.start();
  const created = await new WorkspaceTabs(tabs, silentLogger()).open('https://example.com/', '7', { bookmarkId: '11' });
  await new Promise((resolve) => setTimeout(resolve, 20));
  const stored = await tabs.get(created.id as number);
  assert.deepEqual(TabData.ownOf(stored), { bookmarkId: '11', lastActive: 42 });
  assert.equal(TabData.of(stored), '7');
  stamps.stop();
});
