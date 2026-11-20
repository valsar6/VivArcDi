import type { Scenario } from '../../../scripts/live/scenarios/ScenarioCatalog.js';
import { column, scrollers, SETTLE_MS, TOLERANCE } from './column.js';

const scenario: Scenario = {
  name: 'no scroll when the list fits',
  spec: '053',
  run: async (driver) => {
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    const found = await scrollers(driver);
    if (found.length > 0) {
      throw new Error(`nothing should scroll, found: ${JSON.stringify(found)}`);
    }
    const spare = await driver.evaluate<number>(`(() => { const box = document.querySelector(${column(driver)}); return box.scrollHeight - box.clientHeight; })()`);
    if (spare > TOLERANCE) {
      throw new Error(`the column overflows by ${spare}px with a single tab`);
    }
  },
};

export default scenario;
