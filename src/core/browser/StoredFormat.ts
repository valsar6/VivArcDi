import type { KeyValueStorage } from './PersistentStorage.js';
import type { SavingStorage } from './SavingStorage.js';

export const VERSION_MEMBER = 'vivarcdi:version';
export const DATA_MEMBER = 'vivarcdi:data';

export type ReadStatus = 'empty' | 'current' | 'newer' | 'unreadable';

export interface StoredRead<T> {
  readonly status: ReadStatus;
  readonly value: T;
  readonly skipped: boolean;
}

export interface Readout<T> {
  value: T;
  skipped: boolean;
}

/** Turns data of one version into data of the next. */
export type Upgrade = (data: unknown) => unknown;

export interface FormatRules<T> {
  /** The value of a store with nothing saved. */
  empty: T;
  /** Reads parsed data: the value and whether entries were skipped, or null to reject the shape. */
  read: (data: unknown) => Readout<T> | null;
  /** `upgrades[i]` turns data of version `i + 1` into version `i + 2`. */
  upgrades?: readonly Upgrade[];
}

export interface StoredReader {
  /**
   * @param key A key.
   * @param format The format of the value under the key.
   * @returns What the key holds, read through the format.
   */
  read<T>(key: string, format: StoredFormat<T>): StoredRead<T>;
}

export type ReadingStorage = KeyValueStorage & StoredReader;

export type VersionedStorage = SavingStorage & StoredReader;

interface Parsed {
  version: number;
  data: unknown;
}

const isEnvelope = (parsed: unknown): parsed is Record<string, unknown> => {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return false;
  }
  const names = Object.keys(parsed);
  return names.length === 2 && names.includes(VERSION_MEMBER) && names.includes(DATA_MEMBER);
};

export class StoredFormat<T> {
  #rules: FormatRules<T>;
  #version: number;

  /**
   * The format of one stored value: its upgrade steps, its empty value and its shape check.
   *
   * @param rules The rules of the store.
   */
  constructor(rules: FormatRules<T>) {
    this.#rules = rules;
    this.#version = (rules.upgrades?.length ?? 0) + 1;
  }

  /** @returns The version the store writes: the number of upgrade steps plus one. */
  public get version(): number {
    return this.#version;
  }

  /**
   * Reads a saved text. Never throws and never writes.
   *
   * @param text The saved text, or null.
   * @returns The status and the value; `empty` and `unreadable` carry the empty value.
   */
  public decode(text: string | null): StoredRead<T> {
    if (text === null) {
      return this.#result('empty', this.#rules.empty, false);
    }
    const parsed = this.#parse(text);
    if (parsed === null) {
      return this.#result('unreadable', this.#rules.empty, false);
    }
    if (parsed.version > this.#version) {
      const readout = this.#rules.read(parsed.data);
      return this.#result('newer', readout?.value ?? this.#rules.empty, readout?.skipped ?? false);
    }
    return this.#current(parsed);
  }

  /**
   * @param value The store's value.
   * @returns The text to save: bare at version 1, in an envelope from version 2.
   */
  public encode(value: T): string {
    if (this.#version === 1) {
      return JSON.stringify(value);
    }
    return JSON.stringify({ [VERSION_MEMBER]: this.#version, [DATA_MEMBER]: value });
  }

  #result(status: ReadStatus, value: T, skipped: boolean): StoredRead<T> {
    return { status, value, skipped };
  }

  #parse(text: string): Parsed | null {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return null;
    }
    if (!isEnvelope(parsed)) {
      return { version: 1, data: parsed };
    }
    const version = parsed[VERSION_MEMBER];
    if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
      return null;
    }
    return { version, data: parsed[DATA_MEMBER] };
  }

  #current(parsed: Parsed): StoredRead<T> {
    const upgraded = this.#upgrade(parsed);
    const readout = upgraded === null ? null : this.#rules.read(upgraded.data);
    if (readout === null) {
      return this.#result('unreadable', this.#rules.empty, false);
    }
    return this.#result('current', readout.value, readout.skipped);
  }

  #upgrade(parsed: Parsed): { data: unknown } | null {
    let data = parsed.data;
    try {
      for (const step of (this.#rules.upgrades ?? []).slice(parsed.version - 1)) {
        data = step(data);
      }
    } catch {
      return null;
    }
    return { data };
  }
}
