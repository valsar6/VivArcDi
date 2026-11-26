import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { GuardedStorage } from '../../src/core/boot/GuardedStorage.js';
import type { PayloadSource } from '../../src/core/boot/ResourceLoader.js';
import type { SavingStorage } from '../../src/core/browser/SavingStorage.js';
import { Notices } from '../../src/core/dom/Notices.js';
import type { ToastKind } from '../../src/core/dom/Toast.js';
import { Logger } from '../../src/core/support/Logger.js';

export class FakeLoader implements PayloadSource {
  #files: Record<string, unknown>;

  constructor(files: Record<string, unknown>) {
    this.#files = files;
  }

  public url(path: string): string {
    return `chrome-extension://vivaldi/vivarcdi/${path}`;
  }

  public async json<T>(path: string): Promise<T> {
    if (!(path in this.#files)) {
      throw new Error(`Missing ${path}`);
    }
    return structuredClone(this.#files[path]) as T;
  }

  public async text(path: string): Promise<string> {
    return String(await this.json<unknown>(path));
  }
}

export class DiskLoader implements PayloadSource {
  #root: string;

  constructor(root: string) {
    this.#root = root;
  }

  public url(path: string): string {
    return `chrome-extension://vivaldi/vivarcdi/${path}`;
  }

  public async json<T>(path: string): Promise<T> {
    return JSON.parse(await this.text(path)) as T;
  }

  public async text(path: string): Promise<string> {
    return readFile(join(this.#root, path), 'utf8');
  }
}

export class FakeElement {
  public tagName: string;
  public dataset: Record<string, string> = {};
  public classes = new Set<string>();
  public children: FakeElement[] = [];
  public parent: FakeElement | null = null;
  public textContent = '';
  public attributes: Record<string, string> = {};
  public properties = new Map<string, string>();
  public style = {
    setProperty: (name: string, value: string): Map<string, string> => this.properties.set(name, value),
    removeProperty: (name: string): boolean => this.properties.delete(name),
  };
  public classList = {
    add: (name: string): Set<string> => this.classes.add(name),
    remove: (name: string): boolean => this.classes.delete(name),
    contains: (name: string): boolean => this.classes.has(name),
  };

  constructor(tagName = 'div') {
    this.tagName = tagName;
  }

  public setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  public toggleAttribute(name: string, force: boolean): void {
    if (force) {
      this.attributes[name] = '';
    } else {
      delete this.attributes[name];
    }
  }

  public append(child: FakeElement): void {
    child.parent = this;
    this.children.push(child);
  }

  public remove(): void {
    if (this.parent) {
      this.parent.children = this.parent.children.filter((child) => child !== this);
    }
  }
}

export class FakeDocument {
  public elements: Record<string, FakeElement>;
  public head = new FakeElement('head');

  constructor(elementsBySelector: Record<string, FakeElement> = {}) {
    this.elements = elementsBySelector;
  }

  public querySelector(selector: string): FakeElement | null {
    return this.elements[selector] ?? null;
  }

  public createElement(tagName: string): FakeElement {
    return new FakeElement(tagName);
  }
}

export class SilentSink {
  public lines: unknown[][] = [];

  public debug(...args: unknown[]): void {
    this.lines.push(['debug', ...args]);
  }

  public info(...args: unknown[]): void {
    this.lines.push(['info', ...args]);
  }

  public warn(...args: unknown[]): void {
    this.lines.push(['warn', ...args]);
  }

  public error(...args: unknown[]): void {
    this.lines.push(['error', ...args]);
  }
}

export class RecordingToast {
  public shown: Array<{ text: string; kind: ToastKind | undefined }> = [];
  public removed = 0;

  public show(text: string, kind?: ToastKind): void {
    this.shown.push({ text, kind });
  }

  public remove(): void {
    this.removed += 1;
  }
}

export const silentNotices = (): Notices => new Notices(new RecordingToast());

export const guarded = (inner: SavingStorage, logger: Logger = new Logger('test', new SilentSink())): GuardedStorage =>
  new GuardedStorage(inner, silentNotices(), logger);
