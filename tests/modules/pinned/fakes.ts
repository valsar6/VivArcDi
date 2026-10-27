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
