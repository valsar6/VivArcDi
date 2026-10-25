type Listener = (event: Event) => void;

export class FakeElement {
  public tagName: string;
  public className = '';
  public title = '';
  public textContent = '';
  public src = '';
  public children: FakeElement[] = [];
  public parent: FakeElement | null = null;
  public attributes = new Map<string, string>();
  public listeners = new Map<string, Set<Listener>>();
  public properties = new Map<string, string>();
  public executed: string[] = [];
  public style = {
    setProperty: (name: string, value: string): Map<string, string> => this.properties.set(name, value),
  };

  constructor(tagName = 'div', attributes: Record<string, string> = {}) {
    this.tagName = tagName;
    Object.entries(attributes).forEach(([name, value]) => this.attributes.set(name, value));
  }

  public get isConnected(): boolean {
    return this.parent !== null;
  }

  public append(...nodes: FakeElement[]): void {
    nodes.forEach((node) => {
      node.parent = this;
      this.children.push(node);
    });
  }

  public remove(): void {
    if (this.parent) {
      this.parent.children = this.parent.children.filter((child) => child !== this);
      this.parent = null;
    }
  }

  public getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  public setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  public hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  public removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  public toggleAttribute(name: string, force: boolean): boolean {
    if (force) {
      this.attributes.set(name, '');
    } else {
      this.attributes.delete(name);
    }
    return force;
  }

  public addEventListener(type: string, listener: Listener): void {
    const set = this.listeners.get(type) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(type, set);
  }

  public removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  public dispatch(type: string, event: Record<string, unknown> = {}): void {
    const full = { type, preventDefault: (): void => {}, ...event } as unknown as Event;
    this.listeners.get(type)?.forEach((listener) => listener(full));
  }

  public listenerCount(): number {
    return [...this.listeners.values()].reduce((count, set) => count + set.size, 0);
  }

  public executeScript({ code }: { code: string }): void {
    this.executed.push(code);
  }

  public focus(): void {}

  public descendants(): FakeElement[] {
    return this.children.flatMap((child) => [child, ...child.descendants()]);
  }

  public querySelector(selector: string): FakeElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  public querySelectorAll(selector: string): FakeElement[] {
    const tabId = /tab_id="(\d+)"/.exec(selector)?.[1];
    return this.descendants().filter((element) =>
      tabId === undefined
        ? element.tagName === 'webview' && element.hasAttribute('tab_id')
        : element.getAttribute('tab_id') === tabId,
    );
  }
}

export class FakeDocument {
  public elements: Record<string, FakeElement>;
  public root = new FakeElement('document');

  constructor(elements: Record<string, FakeElement>) {
    this.elements = elements;
  }

  public querySelector(selector: string): FakeElement | null {
    return this.elements[selector] ?? null;
  }

  public createElement(tagName: string): FakeElement {
    return new FakeElement(tagName);
  }

  public addEventListener(type: string, listener: Listener): void {
    this.root.addEventListener(type, listener);
  }

  public removeEventListener(type: string, listener: Listener): void {
    this.root.removeEventListener(type, listener);
  }
}

export class FakeEvent<ListenerType> {
  public listeners = new Set<ListenerType>();

  public addListener(listener: ListenerType): void {
    this.listeners.add(listener);
  }

  public removeListener(listener: ListenerType): void {
    this.listeners.delete(listener);
  }
}
