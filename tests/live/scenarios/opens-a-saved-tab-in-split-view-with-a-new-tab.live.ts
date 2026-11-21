import type { Scenario } from '../../../scripts/live/scenarios/ScenarioCatalog.js';
import { chooseSplitView, createSavedTab, markAsTile, removeSavedTab, sideBySide, tiledTabs, waitForSplit, waitForTiledWebviews, WAIT_MS } from './savedTab.js';

const scenario: Scenario = {
  name: 'opens a saved tab in split view with a new tab',
  spec: '056',
  run: async (driver) => {
    const tileTab = await driver.evaluate<number>(`chrome.tabs.create({ url: 'about:blank#tile-tab', active: true }).then((tab) => tab.id)`);
    await markAsTile(driver, tileTab);
    const saved = await createSavedTab(driver, 'https://example.com/#056-split-blank');
    try {
      await chooseSplitView(driver, saved);
      await waitForSplit(driver, saved);
      const tabs = await tiledTabs(driver);
      const row = tabs.find((tab) => tab.bookmarkId === saved.bookmarkId);
      const blank = tabs.find((tab) => tab.group !== null && tab.id !== row?.id);
      if (row === undefined || blank === undefined) {
        throw new Error(`the saved tab or the new tab is missing after the command: ${JSON.stringify(tabs)}`);
      }
      if (blank.id === tileTab) {
        throw new Error('the row was tiled with the Favorites tile tab that was selected, not with a new tab: ' + JSON.stringify(tabs));
      }
      if (row.group !== blank.group || row.index !== 0 || blank.index !== 1) {
        throw new Error(`expected the row at index 0 and the new tab at index 1 of one group, found ${JSON.stringify([row, blank])}`);
      }
      await waitForTiledWebviews(driver, [row.id, blank.id]);
      if (!(await sideBySide(driver, row.id, blank.id))) {
        throw new Error('the row and the new tab are tiled but not side by side');
      }
      await driver.waitFor(`document.activeElement?.matches(${JSON.stringify(driver.selector('addressField'))})`, WAIT_MS);
    } finally {
      await removeSavedTab(driver, saved);
      await driver.evaluate(`chrome.tabs.remove(${tileTab})`);
    }
  },
};

export default scenario;
