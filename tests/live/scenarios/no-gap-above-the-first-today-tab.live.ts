import type { Driver } from '../../../scripts/live/Driver.js';
import type { Scenario } from '../../../scripts/live/scenarios/ScenarioCatalog.js';

const TOLERANCE = 1;

async function openTabs(driver: Driver): Promise<void> {
  await driver.evaluate(`(async () => {
    const first = await chrome.tabs.create({ url: 'about:blank#pinned' });
    await chrome.tabs.update(first.id, { pinned: true });
    await chrome.tabs.create({ url: 'about:blank#one' });
    await chrome.tabs.create({ url: 'about:blank#two' });
  })()`);
  await driver.waitFor(`document.querySelectorAll(${JSON.stringify(driver.selector('tabStrip'))} + ' .tab-position').length >= 3`);
}

function gapAboveFirstVisibleSlot(driver: Driver): Promise<number> {
  return driver.evaluate<number>(`(() => {
    const strip = document.querySelector(${JSON.stringify(driver.selector('tabStrip'))});
    const tops = [...strip.querySelectorAll('.tab-position')].map((slot) => slot.getBoundingClientRect()).filter((box) => box.height > 0).map((box) => box.top);
    return Math.min(...tops) - strip.getBoundingClientRect().top;
  })()`);
}

const scenario: Scenario = {
  name: 'no gap above the first Today tab',
  spec: '050',
  run: async (driver) => {
    await openTabs(driver);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const gap = await gapAboveFirstVisibleSlot(driver);
    if (Math.abs(gap) > TOLERANCE) {
      throw new Error(`the first visible slot starts ${gap}px below the top of the strip`);
    }
  },
};

export default scenario;
