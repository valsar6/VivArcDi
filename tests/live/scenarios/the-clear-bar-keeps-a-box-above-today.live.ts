import type { Driver } from '../../../scripts/live/Driver.js';
import type { Scenario } from '../../../scripts/live/scenarios/ScenarioCatalog.js';

const TOLERANCE = 1;
const CLEAR = '[data-vivarcdi-clear]';
const HIDDEN_GROUP = '[data-vivarcdi-pinned-last]';
const PINNED_TILE = '[data-vivarcdi-tile-source="pinned"] [data-vivarcdi-tile]';
const OWN_ROW = '[data-vivarcdi-own-row]';

interface Placement {
  clear: { left: number; right: number; top: number; bottom: number; width: number; height: number };
  todayTop: number;
  insideHiddenGroup: boolean;
  reachesControl: boolean;
}

async function openTabs(driver: Driver): Promise<number[]> {
  const ids = await driver.evaluate<number[]>(`(async () => {
    const pinned = await chrome.tabs.create({ url: 'about:blank#pinned' });
    await chrome.tabs.update(pinned.id, { pinned: true });
    const one = await chrome.tabs.create({ url: 'about:blank#one' });
    await chrome.tabs.create({ url: 'about:blank#two' });
    return [pinned.id, one.id];
  })()`);
  await driver.waitForElement(PINNED_TILE);
  await driver.waitFor(`(() => {
    const clear = document.querySelector(${JSON.stringify(CLEAR)});
    const box = clear === null ? null : clear.getBoundingClientRect();
    return box !== null && box.width > 0 && box.height > 0;
  })()`);
  return ids;
}

function placement(driver: Driver): Promise<Placement> {
  const strip = JSON.stringify(driver.selector('tabStrip'));
  return driver.evaluate<Placement>(`(() => {
    const strip = document.querySelector(${strip});
    const clear = document.querySelector(${JSON.stringify(CLEAR)});
    const rect = clear.getBoundingClientRect();
    const todays = [...strip.querySelectorAll('.tab-position')]
      .filter((slot) => slot.getBoundingClientRect().height > 0 && !slot.matches(${JSON.stringify(driver.selector('pinnedTab'))}))
      .map((slot) => slot.getBoundingClientRect().top);
    const point = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return {
      clear: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
      todayTop: Math.min(...todays),
      insideHiddenGroup: clear.closest(${JSON.stringify(HIDDEN_GROUP)}) !== null,
      reachesControl: point !== null && (point === clear || clear.contains(point) || point.closest(${JSON.stringify(OWN_ROW)}) !== null),
    };
  })()`);
}

const scenario: Scenario = {
  name: 'the Clear bar keeps a box above Today with the Favorites grid on',
  spec: '060',
  run: async (driver) => {
    const ids = await openTabs(driver);
    try {
      const { clear, todayTop, insideHiddenGroup, reachesControl } = await placement(driver);
      if (clear.width <= 0 || clear.height <= 0) {
        throw new Error(`the Clear control measures ${clear.width}x${clear.height}`);
      }
      if (insideHiddenGroup) {
        throw new Error('the Clear control sits inside the hidden pinned group');
      }
      if (clear.bottom > todayTop + TOLERANCE) {
        throw new Error(`the Clear control ends at ${clear.bottom}px, below the first Today slot at ${todayTop}px`);
      }
      if (!reachesControl) {
        throw new Error('the middle of the Clear control is covered by something else');
      }
    } finally {
      await driver.evaluate(`chrome.tabs.remove(${JSON.stringify(ids)})`);
    }
  },
};

export default scenario;
