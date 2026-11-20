import type { Driver } from '../../../scripts/live/Driver.js';

export const TOLERANCE = 1;
export const SETTLE_MS = 1500;
const MANY_TABS = 40;

export function column(driver: Driver): string {
  return JSON.stringify(driver.selector('tabsContainer'));
}

export async function openTabs(driver: Driver, count = MANY_TABS): Promise<void> {
  await driver.evaluate(`(async () => {
    for (let index = 0; index < ${count}; index += 1) {
      await chrome.tabs.create({ url: 'about:blank#tab-' + index, active: false });
    }
  })()`);
  await driver.waitFor(`document.querySelectorAll(${JSON.stringify(driver.selector('tabStrip'))} + ' .tab-position').length >= ${count}`);
  await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
}

export async function pinOneTab(driver: Driver): Promise<void> {
  await driver.evaluate(`(async () => {
    const tab = await chrome.tabs.create({ url: 'about:blank#pinned', active: false });
    await chrome.tabs.update(tab.id, { pinned: true });
  })()`);
  await driver.waitFor(`document.querySelector(${JSON.stringify(driver.selector('pinnedTab'))}) !== null`);
}

export async function openLongFolder(driver: Driver, rows = MANY_TABS): Promise<void> {
  await driver.evaluate(`(() => {
    const section = document.querySelector('[data-vivarcdi-folders]');
    section.removeAttribute('data-vivarcdi-empty');
    section.removeAttribute('hidden');
    for (let index = 0; index < ${rows}; index += 1) {
      const row = document.createElement('div');
      row.setAttribute('role', 'treeitem');
      row.setAttribute('data-live-row', '');
      row.textContent = 'Row ' + index;
      section.append(row);
    }
  })()`);
  await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
}

export function scrollers(driver: Driver): Promise<string[]> {
  return driver.evaluate<string[]>(`(() => [...document.querySelectorAll(${JSON.stringify(driver.selector('tabBar') + ' *')})]
    .filter((element) => /auto|scroll/.test(getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight + ${TOLERANCE})
    .map((element) => element.id || (element.hasAttribute('data-vivarcdi-folders') ? 'folders' : element.className)))()`);
}

export async function removeLongFolder(driver: Driver): Promise<void> {
  await driver.evaluate(`document.querySelectorAll('[data-live-row]').forEach((row) => row.remove())`);
}
