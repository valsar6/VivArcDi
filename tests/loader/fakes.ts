import type { PayloadSource } from '../../src/core/ResourceLoader.js';

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

export class FakeElement {
  public tagName: string;
  public dataset: Record<string, string> = {};
  public classes = new Set<string>();
  public children: FakeElement[] = [];
  public parent: FakeElement | null = null;
  public classList = {
    add: (name: string): Set<string> => this.classes.add(name),
    remove: (name: string): boolean => this.classes.delete(name),
    contains: (name: string): boolean => this.classes.has(name),
  };

  constructor(tagName = 'div') {
    this.tagName = tagName;
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
