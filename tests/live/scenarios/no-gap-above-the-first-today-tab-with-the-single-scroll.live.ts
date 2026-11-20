import type { Scenario } from '../../../scripts/live/scenarios/ScenarioCatalog.js';
import { column, pinOneTab, SETTLE_MS, TOLERANCE } from './column.js';

const scenario: Scenario = {
  name: 'no gap above the first Today tab with the single scroll',
  spec: '053',
  run: async (driver) => {
    await pinOneTab(driver);
    await driver.evaluate(`(async () => {
      await chrome.tabs.create({ url: 'about:blank#one', active: false });
      await chrome.tabs.create({ url: 'about:blank#two', active: false });
    })()`);
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    const marked = await driver.evaluate<boolean>(`document.querySelector(${column(driver)}).hasAttribute('data-vivarcdi-column-scroll')`);
    if (!marked) {
      throw new Error('the column is not marked for the single scroll');
    }
    const gap = await driver.evaluate<number>(`(() => {
      const strip = document.querySelector(${JSON.stringify(driver.selector('tabStrip'))});
      const tops = [...strip.querySelectorAll('.tab-position')].map((slot) => slot.getBoundingClientRect()).filter((box) => box.height > 0).map((box) => box.top);
      return Math.min(...tops) - strip.getBoundingClientRect().top;
    })()`);
    if (Math.abs(gap) > TOLERANCE) {
      throw new Error(`the first visible slot starts ${gap}px below the top of the strip`);
    }
  },
};

export default scenario;
