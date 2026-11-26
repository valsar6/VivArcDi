import type { Driver } from '../../../scripts/live/Driver.js';
import type { Scenario } from '../../../scripts/live/scenarios/ScenarioCatalog.js';

const TOLERANCE = 2;
const EXPECTED_SIZE = 24;
const EXPECTED_RADIUS = 5;
const TILE_SOURCE = '[data-vivarcdi-tile-source="pinned"]';
const TILE = '[data-vivarcdi-tile]';
const MINUS = '[data-vivarcdi-tile-minus]';
const TILE_MINUS = `${TILE_SOURCE} ${TILE} ${MINUS}`;

interface Badge {
  width: number;
  height: number;
  radius: number;
  inset: number;
  hasDash: boolean;
}

async function openPinnedTab(driver: Driver): Promise<number> {
  const id = await driver.evaluate<number>(`(async () => {
    const tab = await chrome.tabs.create({ url: 'about:blank#pinned-minus' });
    await chrome.tabs.update(tab.id, { pinned: true });
    return tab.id;
  })()`);
  await driver.waitForElement(TILE_MINUS);
  return id;
}

function badge(driver: Driver): Promise<Badge> {
  return driver.evaluate<Badge>(`(() => {
    const minus = document.querySelector(${JSON.stringify(TILE_MINUS)});
    const tile = minus.parentElement;
    const box = minus.getBoundingClientRect();
    const tileBox = tile.getBoundingClientRect();
    const style = getComputedStyle(minus);
    const dash = getComputedStyle(minus, '::before');
    return {
      width: box.width,
      height: box.height,
      radius: parseFloat(style.borderTopLeftRadius),
      inset: tileBox.right - box.right,
      hasDash: dash.maskImage.includes('svg') || dash.webkitMaskImage.includes('svg'),
    };
  })()`);
}

const scenario: Scenario = {
  name: 'the pinned minus is a badge on the tile of a pinned tab',
  spec: '061',
  run: async (driver) => {
    const id = await openPinnedTab(driver);
    try {
      const { width, height, radius, inset, hasDash } = await badge(driver);
      if (Math.abs(width - EXPECTED_SIZE) > TOLERANCE || Math.abs(height - EXPECTED_SIZE) > TOLERANCE) {
        throw new Error(`the tile minus measures ${width}x${height}, expected ${EXPECTED_SIZE}x${EXPECTED_SIZE}`);
      }
      if (Math.abs(radius - EXPECTED_RADIUS) > TOLERANCE) {
        throw new Error(`the tile minus has a ${radius}px radius, expected ${EXPECTED_RADIUS}px`);
      }
      if (inset < 0 || inset > 20) {
        throw new Error(`the tile minus sits ${inset}px from the right end of the tile`);
      }
      if (!hasDash) {
        throw new Error('the tile minus has no masked dash');
      }
    } finally {
      await driver.evaluate(`chrome.tabs.remove(${JSON.stringify(id)})`);
    }
  },
};

export default scenario;
