import type { Scenario } from '../../../scripts/live/scenarios/ScenarioCatalog.js';
import { chooseSplitView, createSavedTab, removeSavedTab, sideBySide, tiledTabs, waitForTiledWebviews, WAIT_MS } from './savedTab.js';

const scenario: Scenario = {
  name: 'opens a saved tab in split view with a new tab',
  spec: '056',
  run: async (driver) => {
    const original = await driver.evaluate<number>(`chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => tabs[0].id)`);
    const saved = await createSavedTab(driver, 'https://example.com/#056-split-blank');
    try {
      await chooseSplitView(driver, saved);
      await driver.waitFor(`chrome.tabs.query({ currentWindow: true }).then((tabs) => tabs.filter((tab) => JSON.parse(tab.vivExtData || '{}').tiling).length === 2)`, WAIT_MS);
      const tabs = await tiledTabs(driver);
      const row = tabs.find((tab) => tab.bookmarkId === saved.bookmarkId);
      const blank = tabs.find((tab) => tab.group !== null && tab.id !== row?.id);
      if (row === undefined || blank === undefined) {
        throw new Error('the saved tab or the new tab is missing after the command');
      }
      if (blank.id === original) {
        throw new Error('the row was tiled with the tab that was already open, not with a new tab');
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
    }
  },
};

export default scenario;
