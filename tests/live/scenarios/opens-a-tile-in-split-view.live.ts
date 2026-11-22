import type { Scenario } from '../../../scripts/live/scenarios/ScenarioCatalog.js';
import { chooseSplitView, removeSavedTab, sideBySide, tiledTabs, waitForSplit, waitForTiledWebviews, type SavedTab } from './savedTab.js';

const FOLDER = 'Favorites';

async function createTile(driver: Parameters<Scenario['run']>[0], url: string): Promise<SavedTab> {
  const bookmarkId = await driver.evaluate<string>(`(async () => {
    const roots = (await chrome.bookmarks.getTree())[0].children.flatMap((node) => node.children ?? []);
    const found = roots.find((node) => node.url === undefined && node.title === ${JSON.stringify(FOLDER)});
    const parentId = (found ?? (await chrome.bookmarks.create({ parentId: roots[0].parentId, title: ${JSON.stringify(FOLDER)} }))).id;
    return (await chrome.bookmarks.create({ parentId, title: 'Tile of the live check', url: ${JSON.stringify(url)} })).id;
  })()`);
  const row = `[data-vivarcdi-tile="${bookmarkId}"]`;
  await driver.waitForElement(row);
  return { bookmarkId, row };
}

const scenario: Scenario = {
  name: 'opens a tile in split view',
  spec: '057',
  run: async (driver) => {
    const selected = await driver.evaluate<number>(`chrome.tabs.create({ url: 'about:blank#selected', active: true }).then((tab) => tab.id)`);
    const tile = await createTile(driver, 'https://example.com/#057-split');
    try {
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
