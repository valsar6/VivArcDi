import type { Scenario } from '../../../scripts/live/scenarios/ScenarioCatalog.js';
import { addLinkRow, openTodayTab, READ_TITLES, type TitleReading } from './titles.js';

const scenario: Scenario = {
  name: 'today title keeps layout',
  spec: '073',
  run: async (driver) => {
    await openTodayTab(driver);
    await addLinkRow(driver);
    const reading = await driver.evaluate<TitleReading>(READ_TITLES);
    if (reading.overflow !== 'ellipsis' || reading.whiteSpace !== 'nowrap' || reading.hidden !== 'hidden') {
      throw new Error(`the Today title does not ellipsize: ${reading.overflow}, ${reading.whiteSpace}, ${reading.hidden}`);
    }
    if (!reading.transition.includes('padding-inline-end')) {
      throw new Error(`the Today title lost the hover room of the minus badge: ${reading.transition}`);
    }
  },
};

export default scenario;
