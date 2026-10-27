import type { Logger } from '../../../src/core/Logger.js';
import { silentLogger as reopenLogger } from '../reopen/fakes.js';
import { FolderTabs } from '../folders/fakes.js';
import type { FolderTab } from '../folders/fakes.js';

export const silentLogger: Logger = reopenLogger();

export const own = (data: Record<string, unknown>, favoriteId?: string, pinnedUrl?: string): string =>
  JSON.stringify({ ...data, vivarcdi: { ...(favoriteId === undefined ? {} : { favoriteId }), ...(pinnedUrl === undefined ? {} : { pinnedUrl }) } });

/** Tabs that keep what `update` writes, so a later read sees it. */
export class LinkingTabs extends FolderTabs {
  public async get(tabId: number): Promise<chrome.tabs.Tab> {
    return { ...this.tabs.get(tabId) } as chrome.tabs.Tab;
  }

  public override async update(tabId: number, properties: Record<string, unknown>): Promise<chrome.tabs.Tab> {
    const result = await super.update(tabId, properties);
    const tab = this.tabs.get(tabId);
    if (tab !== undefined) {
      this.tabs.set(tabId, { ...tab, ...properties } as FolderTab);
    }
    return result;
  }

  public extData(tabId: number): Record<string, unknown> {
    return JSON.parse(this.tabs.get(tabId)?.vivExtData ?? '{}') as Record<string, unknown>;
  }
}
