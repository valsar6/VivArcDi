import type { Scenario } from '../../../scripts/live/scenarios/ScenarioCatalog.js';
import { column, openTabs, SETTLE_MS, TOLERANCE } from './column.js';

const scenario: Scenario = {
  name: 'the active tab scrolls into view',
  spec: '053',
  run: async (driver) => {
    await openTabs(driver);
    await driver.evaluate(`(async () => {
      const tabs = (await chrome.tabs.query({ currentWindow: true })).sort((a, b) => a.id - b.id);
      await chrome.tabs.update(tabs.at(-1).id, { active: true });
    })()`);
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    const visible = await driver.evaluate<boolean>(`(() => {
      const active = document.querySelector(${JSON.stringify(driver.selector('tabStrip'))} + ' .tab.active').getBoundingClientRect();
      const box = document.querySelector(${column(driver)}).getBoundingClientRect();
      return active.top >= box.top - ${TOLERANCE} && active.bottom <= box.bottom + ${TOLERANCE};
    })()`);
    if (!visible) {
      throw new Error('the active tab is out of view in the column');
    }
  },
};

export default scenario;
