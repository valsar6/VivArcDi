import type { Scenario } from '../../../scripts/live/scenarios/ScenarioCatalog.js';
import { column, openTabs, pinOneTab, TOLERANCE } from './column.js';

const FOOTER = '[data-vivarcdi-archive-footer]';

const scenario: Scenario = {
  name: 'favorites and footer stay fixed while the column scrolls',
  spec: '053',
  run: async (driver) => {
    await pinOneTab(driver);
    await openTabs(driver);
    const positions = `(() => ({
      pinned: document.querySelector(${JSON.stringify(driver.selector('pinnedTab'))}).getBoundingClientRect().top,
      footer: document.querySelector('${FOOTER}').getBoundingClientRect().bottom,
    }))()`;
    const before = await driver.evaluate<{ pinned: number; footer: number }>(positions);
    await driver.evaluate(`document.querySelector(${column(driver)}).scrollTop = 1e6`);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const after = await driver.evaluate<{ pinned: number; footer: number }>(positions);
    if (Math.abs(after.pinned - before.pinned) > TOLERANCE) {
      throw new Error(`the Favorites moved from ${before.pinned}px to ${after.pinned}px`);
    }
    if (Math.abs(after.footer - before.footer) > TOLERANCE) {
      throw new Error(`the Archive footer moved from ${before.footer}px to ${after.footer}px`);
    }
  },
};

export default scenario;
