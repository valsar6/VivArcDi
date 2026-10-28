import type { Logger } from '../../../src/core/Logger.js';
import { silentLogger as reopenLogger } from '../reopen/fakes.js';
import { FolderTabs } from '../folders/fakes.js';

export const silentLogger: Logger = reopenLogger();

export const own = (data: Record<string, unknown>, favoriteId?: string, pinnedUrl?: string): string =>
  JSON.stringify({ ...data, vivarcdi: { ...(favoriteId === undefined ? {} : { favoriteId }), ...(pinnedUrl === undefined ? {} : { pinnedUrl }) } });

/** Folder tabs with `discard` and a parsed read of `vivExtData`. */
export class LinkingTabs extends FolderTabs {
  public async discard(tabId: number): Promise<chrome.tabs.Tab> {
    this.calls.push(['discard', tabId]);
    return { ...this.tabs.get(tabId) } as chrome.tabs.Tab;
  }

  public extData(tabId: number): Record<string, unknown> {
    return JSON.parse(this.tabs.get(tabId)?.vivExtData ?? '{}') as Record<string, unknown>;
  }
}
