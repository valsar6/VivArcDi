import type { Scenario } from '../../../scripts/live/scenarios/ScenarioCatalog.js';
import { chooseSplitView, removeSavedTab, sideBySide, tiledTabs, waitForSplit, waitForTiledWebviews } from './savedTab.js';
import { createTile, menuRows, openTileMenu } from './tile.js';

const LINKS = ['Copy Link', 'Edit Pinned Page', 'Open in Split View', 'Duplicate'];

function checkMenuOrder(rows: { role: string; text: string }[]): void {
  const show = JSON.stringify(rows);
  if (rows[0]?.text !== LINKS[0]) {
    throw new Error(`expected ${LINKS[0]} first in the menu of a tile, found ${show}`);
  }
  let last = -1;
  for (const label of LINKS) {
    const index = rows.findIndex((row) => row.text === label);
    if (index <= last) {
      throw new Error(`expected the link commands in the order ${LINKS.join(', ')}, found ${show}`);
    }
    last = index;
  }
  const untile = rows.findIndex((row) => row.text === 'Untile tab');
  if (untile < 0 || rows[untile - 1]?.role !== 'separator') {
    throw new Error(`expected one separator right before Untile tab, found ${show}`);
  }
  if (rows.findIndex((row) => row.text === 'Pin tab') <= untile) {
    throw new Error(`expected Pin tab right after Untile tab, found ${show}`);
  }
  if (rows.some((row) => row.text.startsWith('Move to'))) {
    throw new Error(`a tile has no Move to in its menu: ${show}`);
  }
}

const scenario: Scenario = {
  name: 'opens a tile in split view',
  spec: '057',
  run: async (driver) => {
    const selected = await driver.evaluate<number>(`chrome.tabs.create({ url: 'about:blank#selected', active: true }).then((tab) => tab.id)`);
    const tile = await createTile(driver, 'https://example.com/#057-split');
    try {
      await openTileMenu(driver, tile);
      checkMenuOrder(await menuRows(driver));
      await chooseSplitView(driver, tile);
      await waitForSplit(driver, tile);
      const tabs = await tiledTabs(driver);
      const page = tabs.find((tab) => tab.bookmarkId === tile.bookmarkId);
      const chosen = tabs.find((tab) => tab.id === selected);
      if (page === undefined || chosen === undefined) {
        throw new Error(`the tile page or the selected tab is missing after the command: ${JSON.stringify(tabs)}`);
      }
      if (page.group === null || page.group !== chosen.group) {
        throw new Error(`the tile page (tiling ${page.group}) and the selected tab (tiling ${chosen.group}) are not in one group: ${JSON.stringify([page, chosen])}`);
      }
      await waitForTiledWebviews(driver, [page.id, selected]);
      if (!(await sideBySide(driver, page.id, selected)) && !(await sideBySide(driver, selected, page.id))) {
        throw new Error('the two pages are tiled but not side by side');
      }
    } finally {
      await removeSavedTab(driver, tile);
    }
  },
};

export default scenario;
