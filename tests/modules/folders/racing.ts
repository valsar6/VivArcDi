import { FolderTabs } from './fakes.js';
import type { FolderTab } from './fakes.js';

/** Tabs whose reads and writes take a turn of the event loop and whose new tabs and written data announce themselves, like Vivaldi's. */
export class RacingFolderTabs extends FolderTabs {
  public override async get(tabId: number): Promise<chrome.tabs.Tab> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    return super.get(tabId);
  }

  public override async update(tabId: number, properties: Record<string, unknown>): Promise<chrome.tabs.Tab> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    const tab = await super.update(tabId, properties);
    this.updated.forEach((listener) => listener(tabId, properties, tab));
    return tab;
  }

  public override open(tab: FolderTab): void {
    super.open({ windowId: 1, ...tab });
  }

  public override async create(properties: chrome.tabs.CreateProperties): Promise<chrome.tabs.Tab> {
    const tab = await super.create(properties);
    this.created.forEach((listener) => listener(tab));
    return tab;
  }
}
