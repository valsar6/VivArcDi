import type { Driver } from '../../../scripts/live/Driver.js';
import type { Scenario } from '../../../scripts/live/scenarios/ScenarioCatalog.js';
import { removeSavedTab } from './savedTab.js';
import { createTile, openTileMenu } from './tile.js';

const CHANGE_ICON = 'Change Icon…';
const ITEM = '[data-vivarcdi-menu] [role="menuitem"]';
const PICKER = '[data-vivarcdi-picker]';
const TAB = '[data-vivarcdi-picker-tab]';
const CELL = '[data-vivarcdi-picker-cell]';
const EMOJI_GRID = '[data-vivarcdi-picker-grid="emoji"]';
const ICONS_GRID = '[data-vivarcdi-picker-grid="icons"]';
const BAR = '[data-vivarcdi-picker-bar]';
const TOLERANCE = 1;
const BOX_SOURCE = '(element) => { const rect = element.getBoundingClientRect(); return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width }; }';

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
}

interface EmojiLayout {
  picker: Box;
  grid: Box;
  bar: Box;
  tops: number[];
  cells: number;
}

interface IconsLayout {
  picker: Box;
  grid: Box;
  tops: number[];
  cells: number;
}

const inside = (inner: Box, outer: Box): boolean =>
  inner.left >= outer.left - TOLERANCE &&
  inner.right <= outer.right + TOLERANCE &&
  inner.top >= outer.top - TOLERANCE &&
  inner.bottom <= outer.bottom + TOLERANCE;

function emojiLayout(driver: Driver): Promise<EmojiLayout> {
  return driver.evaluate<EmojiLayout>(`(() => {
    const box = ${BOX_SOURCE};
    const picker = document.querySelector(${JSON.stringify(PICKER)});
    const grid = picker.querySelector(${JSON.stringify(EMOJI_GRID)});
    const row = [...grid.querySelectorAll(${JSON.stringify(CELL)})].slice(0, 8).map((cell) => Math.round(cell.getBoundingClientRect().top));
    return { picker: box(picker), grid: box(grid), bar: box(picker.querySelector(${JSON.stringify(BAR)})), tops: row, cells: grid.querySelectorAll(${JSON.stringify(CELL)}).length };
  })()`);
}

function iconsLayout(driver: Driver): Promise<IconsLayout> {
  return driver.evaluate<IconsLayout>(`(() => {
    const box = ${BOX_SOURCE};
    const picker = document.querySelector(${JSON.stringify(PICKER)});
    const grid = picker.querySelector(${JSON.stringify(ICONS_GRID)});
    const row = [...grid.querySelectorAll(${JSON.stringify(CELL)})].slice(0, 7).map((cell) => Math.round(cell.getBoundingClientRect().top));
    return { picker: box(picker), grid: box(grid), tops: row, cells: grid.querySelectorAll(${JSON.stringify(CELL)}).length };
  })()`);
}

function checkEmoji(layout: EmojiLayout): void {
  if (!inside(layout.grid, layout.picker) || !inside(layout.bar, layout.picker)) {
    throw new Error(`the emoji grid or the category bar is outside the popover: ${JSON.stringify(layout)}`);
  }
  if (layout.grid.width < 256) {
    throw new Error(`the emoji grid is squeezed to ${layout.grid.width} px: ${JSON.stringify(layout)}`);
  }
  if (new Set(layout.tops).size !== 1) {
    throw new Error(`the emoji do not sit eight to a row: ${JSON.stringify(layout.tops)}`);
  }
  if (layout.cells <= 8) {
    throw new Error(`the emoji grid has only ${layout.cells} cells`);
  }
}

function checkIcons(layout: IconsLayout): void {
  if (!inside(layout.grid, layout.picker)) {
    throw new Error(`the icons grid is outside the popover: ${JSON.stringify(layout)}`);
  }
  if (layout.cells !== 24) {
    throw new Error(`expected the 24 symbols, found ${layout.cells}`);
  }
  if (new Set(layout.tops.slice(0, 6)).size !== 1 || layout.tops[6] === layout.tops[0]) {
    throw new Error(`the symbols do not sit six to a row: ${JSON.stringify(layout.tops)}`);
  }
}

const scenario: Scenario = {
  name: 'the icon picker keeps its grid inside the popover',
  spec: '027',
  run: async (driver) => {
    const tile = await createTile(driver, 'https://example.com/#027-picker');
    try {
      await openTileMenu(driver, tile);
      await driver.waitFor(`[...document.querySelectorAll(${JSON.stringify(ITEM)})].some((element) => element.textContent.includes(${JSON.stringify(CHANGE_ICON)}))`);
      await driver.click(ITEM, CHANGE_ICON);
      await driver.waitForElement(PICKER);
      await driver.waitForElement(`${PICKER} ${EMOJI_GRID}`);
      checkEmoji(await emojiLayout(driver));
      await driver.click(TAB, 'Icons');
      checkIcons(await iconsLayout(driver));
    } finally {
      await driver.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
      await removeSavedTab(driver, tile);
    }
  },
};

export default scenario;
