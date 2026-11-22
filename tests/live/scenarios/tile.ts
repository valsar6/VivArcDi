import type { Driver } from '../../../scripts/live/Driver.js';
import type { SavedTab } from './savedTab.js';

const FOLDER = 'Favorites';
const MENU = '[data-vivarcdi-menu][role="menu"]';

export interface MenuRow {
  role: string;
  text: string;
}

/**
 * Creates a link in the Favorites folder of the lab profile and waits for its tile.
 *
 * @param driver Interface to window.html.
 * @param url Address of the tile.
 * @returns The bookmark id and the selector of its tile.
 */
export async function createTile(driver: Driver, url: string): Promise<SavedTab> {
  const bookmarkId = await driver.evaluate<string>(`(async () => {
    const roots = (await chrome.bookmarks.getTree())[0].children.flatMap((node) => node.children ?? []);
    const found = roots.find((node) => node.url === undefined && node.title === ${JSON.stringify(FOLDER)});
    const parentId = (found ?? (await chrome.bookmarks.create({ parentId: roots[0].parentId, title: ${JSON.stringify(FOLDER)} }))).id;
    return (await chrome.bookmarks.create({ parentId, title: 'Tile of the live check', url: ${JSON.stringify(url)} })).id;
  })()`);
  await driver.waitForElement(`[data-vivarcdi-tile="${bookmarkId}"]`);
  return { bookmarkId, row: `[data-vivarcdi-tile="${bookmarkId}"]` };
}

/**
 * Opens the menu of a tile with a right click and waits for its first row.
 *
 * @param driver Interface to window.html.
 * @param tile The tile to right click.
 */
export async function openTileMenu(driver: Driver, tile: SavedTab): Promise<void> {
  await driver.evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(tile.row)});
    const box = element.getBoundingClientRect();
    element.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: box.x + box.width / 2, clientY: box.y + box.height / 2 }));
  })()`);
  await driver.waitFor(`document.querySelector(${JSON.stringify(MENU)}) !== null`);
}

/**
 * @param driver Interface to window.html.
 * @returns Roles and labels of the top-level rows of the open menu, in order.
 */
export function menuRows(driver: Driver): Promise<MenuRow[]> {
  return driver.evaluate<MenuRow[]>(`[...(document.querySelector(${JSON.stringify(MENU)})?.children ?? [])]
    .map((row) => ({ role: row.getAttribute('role') ?? '', text: (row.textContent ?? '').trim() }))`);
}
