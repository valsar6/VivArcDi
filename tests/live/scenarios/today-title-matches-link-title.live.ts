import type { Scenario } from '../../../scripts/live/scenarios/ScenarioCatalog.js';
import { addLinkRow, openTodayTab, READ_TITLES, type TitleReading } from './titles.js';

const scenario: Scenario = {
  name: 'today title matches link title',
  spec: '073',
  run: async (driver) => {
    await openTodayTab(driver);
    await addLinkRow(driver);
    const { today, link } = await driver.evaluate<TitleReading>(READ_TITLES);
    for (const property of ['size', 'weight', 'color'] as const) {
      if (today[property] !== link[property]) {
        throw new Error(`the Today title has font ${property} ${today[property]}, the link title ${link[property]}`);
      }
    }
  },
};

export default scenario;
