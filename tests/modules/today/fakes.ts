import { DomDocument, DomNode } from '../../core/dom.js';
import { LinkingTabs } from '../favorites/linked.js';
import type { ArchiveEntry } from '../../../src/modules/today/ArchiveStore.js';
import type { RepeatTimer } from '../../../src/modules/today/ArchiveSweeper.js';

export const HOUR = 3_600_000;
export const NOW = Date.UTC(2026, 9, 28, 15, 0);

export const stamped = (lastActive: number, data: Record<string, unknown> = {}): string => JSON.stringify({ ...data, vivarcdi: { lastActive } });

export const entry = (url: string, title: string, archivedAt: number, workspace: string | null = null): ArchiveEntry => ({
  url,
  title,
  favIconUrl: null,
  workspace,
  archivedAt,
});

/** Tabs that keep what `update` writes and forget what `remove` closes. */
export class TodayTabs extends LinkingTabs {
  public failingRemove = false;

  public override async remove(tabId: number): Promise<void> {
    this.calls.push(['remove', tabId]);
    if (this.failingRemove) {
      throw new Error('remove failed');
    }
    this.tabs.delete(tabId);
  }

  public switchTo(tabId: number, windowId = 1): void {
    this.tabs.forEach((tab, id) => this.tabs.set(id, { ...tab, active: id === tabId }));
    this.activated.forEach((listener) => listener({ tabId, windowId }));
  }

  public removedIds(): number[] {
    return this.calls.filter(([name]) => name === 'remove').map(([, id]) => id as number);
  }

  public lastActiveOf(tabId: number): unknown {
    return (this.extData(tabId)['vivarcdi'] as Record<string, unknown> | undefined)?.['lastActive'];
  }
}

/** A repeat timer that runs only when the test says so. */
export class ManualTimer {
  public jobs = new Set<() => void>();
  public intervals: number[] = [];

  public readonly repeat: RepeatTimer = (run, intervalMs) => {
    this.jobs.add(run);
    this.intervals.push(intervalMs);
    return () => this.jobs.delete(run);
  };

  public tick(): void {
    this.jobs.forEach((run) => run());
  }
}

export class TodayNode extends DomNode {
  public override value = '';

  public get lastElementChild(): DomNode | null {
    return this.children.at(-1) ?? null;
  }
}

export class TodayDocument extends DomDocument {
  public override createElement(tagName: string): TodayNode {
    const node = new TodayNode(tagName, this);
    this.created.push(node);
    return node;
  }

  public panel(): DomNode | undefined {
    return this.created.findLast((node) => node.hasAttribute('data-vivarcdi-archive') && node.parentElement !== null);
  }
}
