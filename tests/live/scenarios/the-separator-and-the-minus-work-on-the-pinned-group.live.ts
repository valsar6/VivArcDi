import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Driver } from '../../../scripts/live/Driver.js';
import type { Scenario } from '../../../scripts/live/scenarios/ScenarioCatalog.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const LAST = '[data-vivarcdi-pinned-last]';
const MINUS = '[data-vivarcdi-pinned-minus]';
const AWAY = 'about:blank#058-away';

interface PayloadConfig {
  modules: { 'favorites-grid': { maxTiles: number } };
}

interface Seen {
  rows: number;
  lastMarked: boolean;
}

function maxTiles(): number {
  const config = JSON.parse(readFileSync(join(ROOT, 'src', 'config.json'), 'utf8')) as PayloadConfig;
  return config.modules['favorites-grid'].maxTiles;
}

async function pinTabs(driver: Driver, count: number, ids: number[]): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    const id = await driver.evaluate<number>(`(async () => {
      const tab = await chrome.tabs.create({ url: ${JSON.stringify(`about:blank#058-${index}`)} });
      await chrome.tabs.update(tab.id, { pinned: true });
      return tab.id;
    })()`);
    ids.push(id);
  }
}

const scenario: Scenario = {
  name: 'the separator and the minus work on the pinned group',
  spec: '058',
  run: async (driver) => {
    const count = maxTiles() + 1;
    const rows = `${driver.selector('pinnedGroup')} ${driver.selector('pinnedTab')}`;
    const ids: number[] = [];
    try {
      await pinTabs(driver, count, ids);
      await driver.waitForElement(rows);
      const id = ids[count - 1] as number;
      await driver.evaluate(`chrome.tabs.update(${id}, { url: ${JSON.stringify(AWAY)} })`);
      const lastMarked = `(() => {
        const all = [...document.querySelectorAll(${JSON.stringify(rows)})];
        return { rows: all.length, lastMarked: all.at(-1)?.closest(${JSON.stringify(LAST)}) != null };
      })()`;
      try {
        await driver.waitFor(`${lastMarked}.lastMarked`);
      } catch {
        const seen = await driver.evaluate<Seen>(lastMarked);
        throw new Error(`the last of ${seen.rows} pinned rows has no separator mark`);
      }
      await driver.click(`${driver.selector('pinnedGroup')} ${LAST} ${MINUS}`);
      await driver.waitFor(`chrome.tabs.get(${id}).then((tab) => tab.discarded)`);
      await driver.evaluate(`chrome.tabs.update(${id}, { active: true })`);
      const page = JSON.stringify(`about:blank#058-${count - 1}`);
      await driver.waitFor(`chrome.tabs.get(${id}).then((tab) => (tab.url || tab.pendingUrl) === ${page})`);
    } finally {
      for (const id of ids) {
        await driver.evaluate(`chrome.tabs.remove(${id})`);
      }
    }
  },
};

export default scenario;
