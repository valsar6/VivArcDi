import type { Scenario } from '../../../scripts/live/scenarios/ScenarioCatalog.js';
import { TOLERANCE } from './column.js';
import { addLinkRow, openTodayTab, READ_TITLES, type TitleReading } from './titles.js';

const scenario: Scenario = {
  name: 'today title aligns with its icon',
  spec: '073',
  run: async (driver) => {
    await openTodayTab(driver);
    await addLinkRow(driver);
    const reading = await driver.evaluate<TitleReading>(READ_TITLES);
    if (Math.abs(reading.centerOffset) > TOLERANCE) {
      throw new Error(`the Today title is ${reading.centerOffset}px off the center of its icon`);
    }
    if (Math.abs(reading.todayGap - reading.linkGap) > TOLERANCE) {
      throw new Error(`the Today title starts ${reading.todayGap}px from its icon, a link title ${reading.linkGap}px`);
    }
  },
};

export default scenario;
