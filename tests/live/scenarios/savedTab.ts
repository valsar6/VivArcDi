import type { Driver } from '../../../scripts/live/Driver.js';

export const SPLIT_ITEM = 'Open in Split View';
export const WAIT_MS = 15_000;
const BASE = 'VivArcDi';
const OUTSIDE = 'Tabs';

export interface SavedTab {
  bookmarkId: string;
  row: string;
}

export async function createSavedTab(driver: Driver, url: string): Promise<SavedTab> {
  const bookmarkId = await driver.evaluate<string>(`(async () => {
    const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
    const workspaceId = JSON.parse(active.vivExtData || '{}').workspaceId;
    const list = await new Promise((resolve) => vivaldi.prefs.get('vivaldi.workspaces.list', (result) => resolve(result.value ?? result)));
    const name = list.find((entry) => String(entry.id) === String(workspaceId))?.name ?? ${JSON.stringify(OUTSIDE)};
    let parentId;
    for (const title of [${JSON.stringify(BASE)}, name]) {
      const children = parentId === undefined ? (await chrome.bookmarks.getTree())[0].children.flatMap((node) => node.children ?? []) : await chrome.bookmarks.getChildren(parentId);
      const found = children.find((node) => node.url === undefined && node.title === title);
      parentId = (found ?? (await chrome.bookmarks.create({ parentId, title }))).id;
    }
    return (await chrome.bookmarks.create({ parentId, title: 'Saved by the live check', url: ${JSON.stringify(url)} })).id;
  })()`);
  const row = `[data-vivarcdi-link-id="${bookmarkId}"]`;
  await driver.waitForElement(row);
  return { bookmarkId, row };
}

export async function removeSavedTab(driver: Driver, saved: SavedTab): Promise<void> {
  await driver.evaluate(`chrome.bookmarks.remove(${JSON.stringify(saved.bookmarkId)})`);
}

export async function chooseSplitView(driver: Driver, saved: SavedTab): Promise<void> {
  await driver.evaluate(`(() => {
    const box = document.querySelector(${JSON.stringify(saved.row)}).getBoundingClientRect();
    document.querySelector(${JSON.stringify(saved.row)}).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: box.x + box.width / 2, clientY: box.y + box.height / 2 }));
  })()`);
  const item = '[data-vivarcdi-menu] [role="menuitem"]';
  await driver.waitFor(`[...document.querySelectorAll(${JSON.stringify(item)})].some((element) => element.textContent === ${JSON.stringify(SPLIT_ITEM)})`);
  await driver.click(item, SPLIT_ITEM);
}

export interface Tiled {
  id: number;
  url: string;
  group: string | null;
  index: number | null;
  bookmarkId: string | null;
}

export function tiledTabs(driver: Driver): Promise<Tiled[]> {
  return driver.evaluate<Tiled[]>(`(async () => (await chrome.tabs.query({ currentWindow: true })).map((tab) => {
    const data = JSON.parse(tab.vivExtData || '{}');
    return { id: tab.id, url: tab.url || tab.pendingUrl || '', group: data.tiling?.id ?? null, index: data.tiling?.index ?? null, bookmarkId: data.vivarcdi?.bookmarkId ?? null };
  }))()`);
}

export async function waitForTiledWebviews(driver: Driver, ids: number[]): Promise<void> {
  const webview = (id: number): string => `document.querySelector(${JSON.stringify(`${driver.selector('tabWebview')}`.replace('[tab_id]', `[tab_id="${id}"]`))})`;
  await driver.waitFor(`${ids.map((id) => `${webview(id)}?.classList.contains('tiled')`).join(' && ')}`, WAIT_MS);
}

export async function sideBySide(driver: Driver, left: number, right: number): Promise<boolean> {
  const webview = (id: number): string => `document.querySelector(${JSON.stringify(driver.selector('tabWebview').replace('[tab_id]', `[tab_id="${id}"]`))}).getBoundingClientRect()`;
  return driver.evaluate<boolean>(`(() => {
    const first = ${webview(left)};
    const second = ${webview(right)};
    return first.width > 0 && second.width > 0 && first.right <= second.left + 1 && Math.abs(first.top - second.top) <= 1;
  })()`);
}
