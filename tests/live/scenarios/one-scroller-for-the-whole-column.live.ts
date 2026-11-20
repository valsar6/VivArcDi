import type { Scenario } from '../../../scripts/live/scenarios/ScenarioCatalog.js';
import { column, openTabs, scrollers } from './column.js';

const scenario: Scenario = {
  name: 'one scroller for the whole column',
  spec: '053',
  run: async (driver) => {
    await openTabs(driver);
    const found = await scrollers(driver);
    if (found.length !== 1 || found[0] !== 'tabs-container') {
      throw new Error(`expected #tabs-container as the only scroller, found: ${JSON.stringify(found)}`);
    }
    const overflowing = await driver.evaluate<boolean>(`(() => { const box = document.querySelector(${column(driver)}); return box.scrollHeight > box.clientHeight; })()`);
    if (!overflowing) {
      throw new Error('the column does not overflow with many tabs');
    }
  },
};

export default scenario;
