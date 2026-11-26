import type { Driver } from '../../../scripts/live/Driver.js';
import type { Scenario } from '../../../scripts/live/scenarios/ScenarioCatalog.js';

const CLEAR = '[data-vivarcdi-clear]';
const PINNED_TILE = '[data-vivarcdi-tile-source="pinned"] [data-vivarcdi-tile]';

async function openTabs(driver: Driver): Promise<{ ids: number[]; before: number[] }> {
  const before = await driver.evaluate<number[]>(`chrome.tabs.query({}).then((tabs) => tabs.map((tab) => tab.id))`);
  const ids = await driver.evaluate<number[]>(`(async () => {
    const pinned = await chrome.tabs.create({ url: 'about:blank#pinned' });
    await chrome.tabs.update(pinned.id, { pinned: true });
    const one = await chrome.tabs.create({ url: 'file:///etc/hosts' });
    const two = await chrome.tabs.create({ url: 'file:///etc/shells' });
    await chrome.tabs.update(two.id, { active: true });
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (active !== undefined && active.id === two.id) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return [pinned.id, one.id, two.id];
  })()`);
  await driver.waitForElement(PINNED_TILE);
  await driver.waitForElement(CLEAR);
  return { ids, before };
}

const scenario: Scenario = {
  name: 'the Clear shortcut archives the active Today tab',
  spec: '071',
  run: async (driver) => {
    const { ids, before } = await openTabs(driver);
    try {
      await driver.evaluate(`document.querySelector(${JSON.stringify(driver.selector('addressField'))}).focus()`);
      await driver.press('k', ['Meta', 'Shift']);
      const today = [ids[1], ids[2]];
      const gone = await driver.evaluate<boolean>(`(async () => {
        for (let attempt = 0; attempt < 50; attempt += 1) {
          const open = await chrome.tabs.query({});
          if (${JSON.stringify(today)}.every((id) => !open.some((tab) => tab.id === id))) return true;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        return false;
      })()`);
      if (!gone) {
        throw new Error('the Today tabs are still open after the Clear shortcut');
      }
      const after = await driver.evaluate<number[]>(`chrome.tabs.query({}).then((tabs) => tabs.map((tab) => tab.id))`);
      if (!after.includes(ids[0] as number)) {
        throw new Error('the pinned tab was closed by Clear');
      }
      if (after.some((id) => !before.includes(id) && !ids.includes(id))) {
        throw new Error('Clear opened a blank tab although a pinned tab stays open');
      }
    } finally {
      await driver.evaluate(`chrome.tabs.remove(${JSON.stringify(ids)}).catch(() => undefined)`);
    }
  },
};

export default scenario;
