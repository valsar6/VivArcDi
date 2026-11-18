import type { Driver } from '../../../scripts/live/Driver.js';
import type { Scenario } from '../../../scripts/live/scenarios/ScenarioCatalog.js';

const HEADER = '[data-vivarcdi-space-header]';
const WORKSPACES = ['Lab Two', 'Lab One'];

async function switchTo(driver: Driver, name: string): Promise<void> {
  await driver.click(driver.selector('workspaceButton'));
  await driver.waitForElement(driver.selector('workspacePopup'));
  await driver.click(driver.selector('workspaceRow'), name);
  await driver.waitFor(`document.querySelector('${HEADER}')?.textContent.includes(${JSON.stringify(name)})`);
}

const scenario: Scenario = {
  name: 'space header shows each workspace name',
  spec: '011',
  run: async (driver) => {
    for (const name of WORKSPACES) {
      await switchTo(driver, name);
    }
  },
};

export default scenario;
