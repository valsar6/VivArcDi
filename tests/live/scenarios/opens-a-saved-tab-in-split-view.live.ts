import type { Scenario } from '../../../scripts/live/scenarios/ScenarioCatalog.js';
import { chooseSplitView, createSavedTab, removeSavedTab, sideBySide, tiledTabs, waitForSplit, waitForTiledWebviews } from './savedTab.js';

const scenario: Scenario = {
  name: 'opens a saved tab in split view',
  spec: '056',
  run: async (driver) => {
    const selected = await driver.evaluate<number>(`chrome.tabs.create({ url: 'about:blank#selected', active: true }).then((tab) => tab.id)`);
    const saved = await createSavedTab(driver, 'https://example.com/#056-split');
    try {
      await chooseSplitView(driver, saved);
      await waitForSplit(driver, saved);
      const tabs = await tiledTabs(driver);
      const row = tabs.find((tab) => tab.bookmarkId === saved.bookmarkId);
      const chosen = tabs.find((tab) => tab.id === selected);
      if (row === undefined || chosen === undefined) {
        throw new Error(`the saved tab or the selected tab is missing after the command: ${JSON.stringify(tabs)}`);
      }
      if (row.group === null || row.group !== chosen.group) {
        throw new Error(`the saved tab (tiling ${row.group}) and the selected tab (tiling ${chosen.group}) are not in one group: ${JSON.stringify([row, chosen])}`);
      }
      if (row.index !== 0 || chosen.index !== 1) {
        throw new Error(`expected the saved tab at index 0 (left) and the selected tab at index 1 (right), found ${JSON.stringify([row, chosen])}`);
      }
      await waitForTiledWebviews(driver, [row.id, selected]);
      if (!(await sideBySide(driver, row.id, selected))) {
        throw new Error('the two pages are tiled but not side by side');
      }
    } finally {
      await removeSavedTab(driver, saved);
    }
  },
};

export default scenario;
