import type { Scenario } from '../../../scripts/live/scenarios/ScenarioCatalog.js';
import { column, openLongFolder, openTabs, scrollers, TOLERANCE } from './column.js';

const scenario: Scenario = {
  name: "a long folder does not squeeze Today's tabs",
  spec: '053',
  run: async (driver) => {
    await openTabs(driver, 12);
    await openLongFolder(driver);
    const found = await scrollers(driver);
    if (found.length !== 1 || found[0] !== 'tabs-container') {
      throw new Error(`expected #tabs-container as the only scroller, found: ${JSON.stringify(found)}`);
    }
    const heights = await driver.evaluate<{ frame: number; strip: number }>(`(() => ({
      frame: document.querySelector(${JSON.stringify(driver.selector('tabStripFrame'))}).getBoundingClientRect().height,
      strip: Math.max(...[...document.querySelectorAll(${JSON.stringify(driver.selector('tabStrip'))} + ' .tab-position')].map((slot) => slot.getBoundingClientRect().bottom - document.querySelector(${JSON.stringify(driver.selector('tabStrip'))}).getBoundingClientRect().top)),
    }))()`);
    if (heights.frame + TOLERANCE < heights.strip) {
      throw new Error(`the tab strip frame is ${heights.frame}px for ${heights.strip}px of tabs`);
    }
    await driver.evaluate(`document.querySelector(${column(driver)}).scrollTop = 1e6`);
    const reached = await driver.evaluate<boolean>(`(() => { const last = [...document.querySelectorAll(${JSON.stringify(driver.selector('tabStrip'))} + ' .tab-position')].at(-1).getBoundingClientRect(); const box = document.querySelector(${column(driver)}).getBoundingClientRect(); return last.bottom <= box.bottom + ${TOLERANCE}; })()`);
    if (!reached) {
      throw new Error("the last of Today's tabs cannot be reached by scrolling the column");
    }
  },
};

export default scenario;
