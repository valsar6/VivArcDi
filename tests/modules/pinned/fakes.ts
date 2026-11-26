import { FakeNode } from '../favorites/fakes.js';

type Listener = (event: Event) => void;

/** An element that answers `closest` and `dataset` from what the test gives it. */
export class Piece {
  public dataset: Record<string, string> = {};
  #ancestors: Map<string, Piece>;

  constructor(ancestors: Record<string, Piece> = {}, id?: number) {
    this.#ancestors = new Map(Object.entries(ancestors));
    if (id !== undefined) {
      this.dataset['id'] = `tab-${id}`;
    }
  }

  public closest(selector: string): Piece | null {
    return this.#ancestors.get(selector) ?? null;
  }

  public querySelector(): Piece | null {
    return null;
  }
}

/** A row of the tab strip: its favicon and close button, inside a wrapper, maybe pinned. */
export function row(id: number, pinned: boolean): { favicon: Piece; close: Piece } {
  const wrapper = new Piece({}, id);
  const position = new Piece();
  const ancestors: Record<string, Piece> = { wrapper, ...(pinned ? { pinned: position } : {}) };
  const close = new Piece({ ...ancestors });
  const favicon = new Piece({ ...ancestors });
  return { favicon, close };
}

export interface FakeEvent {
  type: string;
  target: unknown;
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
  stopped: boolean;
  preventDefault(): void;
  stopPropagation(): void;
  stopImmediatePropagation(): void;
}

export function event(type: string, fields: Partial<FakeEvent> = {}): FakeEvent {
  return {
    type,
    target: null,
    key: '',
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
    stopped: false,
    preventDefault(): void {
      this.defaultPrevented = true;
    },
    stopPropagation(): void {
      this.stopped = true;
    },
    stopImmediatePropagation(): void {
      this.stopped = true;
    },
    ...fields,
  };
}

export class ListeningDocument {
  public listeners = new Map<string, Listener[]>();

  public addEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  public removeEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((candidate) => candidate !== listener));
  }

  public dispatch(fake: FakeEvent): FakeEvent {
    this.listeners.get(fake.type)?.forEach((listener) => listener(fake as unknown as Event));
    return fake;
  }

  public count(): number {
    return [...this.listeners.values()].reduce((total, list) => total + list.length, 0);
  }
}

/** A node of the tab bar that `append`, `remove` and attribute selectors work on. */
export class MinusNode extends FakeNode {
  public get parentElement(): MinusNode | null {
    return this.parent as MinusNode | null;
  }

  public append(...nodes: MinusNode[]): void {
    nodes.forEach((node) => {
      node.remove();
      node.parent = this;
      this.children.push(node);
    });
  }

  public remove(): void {
    const parent = this.parent;
    if (parent === null) {
      return;
    }
    parent.children = parent.children.filter((child) => child !== this);
    this.parent = null;
  }

  public setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  public getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  public override matches(selector: string): boolean {
    if (selector.startsWith('[') && selector.endsWith(']')) {
      return this.hasAttribute(selector.slice(1, -1));
    }
    return super.matches(selector);
  }
}

/** A document with the browser element and the pinned rows of the tab bar. */
export class MinusDocument extends ListeningDocument {
  public browser = new MinusNode(['[data-browser]']);
  public rows: MinusNode[] = [];

  public addGroupRow(tabId: number): MinusNode {
    const row = this.addRow(tabId);
    new MinusNode(['group'], [row]);
    return row;
  }

  public addRow(tabId: number): MinusNode {
    const favicon = new MinusNode(['favicon']);
    const header = new MinusNode([], [favicon]);
    const wrapper = new MinusNode([], [header]);
    wrapper.setAttribute('data-slot', '');
    wrapper.dataset['id'] = `tab-${tabId}`;
    const row = new MinusNode(['pinned'], [wrapper]);
    this.rows.push(row);
    return row;
  }

  public querySelector(selector: string): MinusNode | null {
    return selector === '[data-browser]' ? this.browser : null;
  }

  public querySelectorAll(selector: string): MinusNode[] {
    return selector === 'pinned' ? this.rows : [];
  }

  public createElement(): MinusNode {
    return new MinusNode();
  }
}
