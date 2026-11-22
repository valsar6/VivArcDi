import { StoredFormat } from './StoredFormat.js';
import type { Readout, VersionedStorage } from './StoredFormat.js';
import type { SaveOutcome } from './SavingStorage.js';
import type { Logger } from '../support/Logger.js';
import { AddressKey } from '../tabs/AddressKey.js';
import { TabData } from '../tabs/TabData.js';

export const LABELS_STORAGE_KEY = 'vivarcdi.labels';

const MAX_DATA_ADDRESS = 8192;
const WEB_ADDRESS = /^https?:\/\//i;
const IMAGE_DATA_ADDRESS = /^data:image\//i;

export type LabelIcon = { emoji: string } | { symbol: string };

export interface LinkLabel {
  /** The short name; absent shows the page title. */
  name?: string;
  /** The emoji or symbol; absent shows the favicon. */
  icon?: LabelIcon;
  /** The favicon read again from the site; the icon wins over it. */
  favicon?: string;
}

export interface LabelChange {
  /** A text sets the field, null removes it. */
  name?: string | null;
  icon?: LabelIcon | null;
  favicon?: string | null;
}

export interface LabelEvent {
  key: string;
  fromSync: boolean;
}

const isText = (value: unknown): value is string => typeof value === 'string' && value !== '';

const isFavicon = (value: unknown): value is string =>
  typeof value === 'string' && (WEB_ADDRESS.test(value) || (IMAGE_DATA_ADDRESS.test(value) && value.length <= MAX_DATA_ADDRESS));

const iconOf = (value: unknown): LabelIcon | undefined => {
  const { emoji, symbol } = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  if (isText(emoji)) {
    return { emoji };
  }
  return isText(symbol) ? { symbol } : undefined;
};

const PARSERS: Record<keyof LinkLabel, (value: unknown) => unknown> = {
  name: (value) => (isText(value) ? value : undefined),
  icon: iconOf,
  favicon: (value) => (isFavicon(value) ? value : undefined),
};

const FIELDS = Object.keys(PARSERS) as Array<keyof LinkLabel>;

const parseFields = (value: Record<string, unknown>): LinkLabel | null => {
  const entry: Record<string, unknown> = {};
  for (const field of FIELDS) {
    const raw = value[field];
    if (raw === undefined) {
      continue;
    }
    const parsed = PARSERS[field](raw);
    if (parsed === undefined) {
      return null;
    }
    entry[field] = parsed;
  }
  return Object.keys(entry).length > 0 ? entry : null;
};

const entryOf = (value: unknown): LinkLabel | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? parseFields(value as Record<string, unknown>) : null;

const FORMAT = new StoredFormat<Record<string, LinkLabel>>({
  empty: {},
  read: (data): Readout<Record<string, LinkLabel>> | null => {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return null;
    }
    const entries = Object.entries(data).map(([key, value]) => [key, entryOf(value)] as const);
    const good = entries.filter((entry): entry is [string, LinkLabel] => entry[1] !== null);
    return { value: Object.fromEntries(good), skipped: good.length < entries.length };
  },
});

export class LabelKeys {
  /**
   * @param id The id of a bookmark.
   * @returns The key of the label of that saved row or bookmark tile.
   */
  public static bookmark(id: string): string {
    return `bookmark:${id}`;
  }

  /**
   * @param tab A pinned tab.
   * @returns The key of the label of the tile made from it, by the address key of its own page or
   * of the page it shows; null when the tab has no web address.
   */
  public static page(tab: chrome.tabs.Tab): string | null {
    const key = AddressKey.from(TabData.ownOf(tab).pinnedUrl ?? tab.url ?? tab.pendingUrl);
    return key === null ? null : `page:${key}`;
  }
}

export class LinkLabels {
  static #instances = new WeakMap<VersionedStorage, LinkLabels>();
  #storage: VersionedStorage;
  #logger: Logger;
  #labels: Map<string, LinkLabel>;
  #listeners = new Set<(event: LabelEvent) => void>();
  #warned = false;

  private constructor(storage: VersionedStorage, logger: Logger) {
    this.#storage = storage;
    this.#logger = logger.child('labels');
    this.#labels = new Map(Object.entries(storage.read(LABELS_STORAGE_KEY, FORMAT).value));
  }

  /**
   * The labels of a window storage: one instance for each storage, so every module sees the
   * changes of the others.
   *
   * @param storage The window storage.
   * @param logger Reports a save that failed.
   * @returns The labels.
   */
  public static of(storage: VersionedStorage, logger: Logger): LinkLabels {
    const known = LinkLabels.#instances.get(storage);
    if (known !== undefined) {
      return known;
    }
    const created = new LinkLabels(storage, logger);
    LinkLabels.#instances.set(storage, created);
    return created;
  }

  /**
   * @param key A label key.
   * @returns The label, or undefined when the link has none.
   */
  public get(key: string): LinkLabel | undefined {
    return this.#labels.get(key);
  }

  /**
   * @returns A copy of every label, by key.
   */
  public all(): ReadonlyMap<string, LinkLabel> {
    return new Map(this.#labels);
  }

  /**
   * Changes a label and tells the listeners at once. A value that is not valid is refused and
   * leaves its field as it was: an empty text, an icon with neither emoji nor symbol, a favicon
   * that is not a web or image address or a `data:` address longer than 8 KB. An entry left with
   * nothing is dropped.
   *
   * @param key A label key.
   * @param change The fields to set or remove.
   * @param options `fromSync` marks a change that came from the sync, which is not written back.
   * @returns The outcome of the save; never throws.
   */
  public async set(key: string, change: LabelChange, options: { fromSync?: boolean } = {}): Promise<SaveOutcome> {
    this.#store(key, LinkLabels.#merge(this.#labels.get(key), change));
    this.#notify({ key, fromSync: options.fromSync === true });
    return this.#save();
  }

  /**
   * Removes the whole label: name, icon and favicon.
   *
   * @param key A label key.
   * @returns The outcome of the save.
   */
  public clear(key: string): Promise<SaveOutcome> {
    this.#labels.delete(key);
    this.#notify({ key, fromSync: false });
    return this.#save();
  }

  /**
   * Gives a link the whole label of another, as when a row is duplicated.
   *
   * @param fromKey The key to copy from; nothing happens when it has no label.
   * @param toKey The key that receives the copy.
   */
  public async copy(fromKey: string, toKey: string): Promise<void> {
    const entry = this.#labels.get(fromKey);
    if (entry !== undefined) {
      this.#labels.set(toKey, { ...entry });
      this.#notify({ key: toKey, fromSync: false });
      await this.#save();
    }
  }

  /**
   * @param listener Called after every change.
   * @returns The function that stops the listener.
   */
  public onChange(listener: (event: LabelEvent) => void): () => void {
    this.#listeners.add(listener);
    return (): void => void this.#listeners.delete(listener);
  }

  static #merge(current: LinkLabel | undefined, change: LabelChange): LinkLabel {
    const merged: Record<string, unknown> = { ...current };
    for (const field of FIELDS) {
      const value: unknown = change[field];
      const parsed = value === undefined || value === null ? undefined : PARSERS[field](value);
      if (value === null) {
        delete merged[field];
      } else if (parsed !== undefined) {
        merged[field] = parsed;
      }
    }
    return merged;
  }

  #store(key: string, label: LinkLabel): void {
    if (Object.keys(label).length === 0) {
      this.#labels.delete(key);
    } else {
      this.#labels.set(key, label);
    }
  }

  #notify(event: LabelEvent): void {
    [...this.#listeners].forEach((listener) => listener(event));
  }

  async #save(): Promise<SaveOutcome> {
    const outcome = await this.#storage.save(LABELS_STORAGE_KEY, FORMAT.encode(Object.fromEntries(this.#labels)));
    if (outcome === 'failed' && !this.#warned) {
      this.#warned = true;
      this.#logger.warn('labels are kept for this session only');
    }
    return outcome;
  }
}
