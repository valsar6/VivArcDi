type Listener = (event: Event) => void;

export class DomNode {
  public tagName: string;
  public className = '';
  public textContent = '';
  public parentElement: DomNode | null = null;
  public children: DomNode[] = [];
  public attributes = new Map<string, string>();
  public properties = new Map<string, string>();
  public listeners = new Map<string, Listener[]>();
  public style = { setProperty: (name: string, value: string): Map<string, string> => this.properties.set(name, value) };
  public ownerDocument: DomDocument;
  public offsetHeight = 0;
  public focused = false;

  constructor(tagName: string, ownerDocument: DomDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
  }

  public get nextElementSibling(): DomNode | null {
    const siblings = this.parentElement?.children ?? [];
    return siblings[siblings.indexOf(this) + 1] ?? null;
  }

  public append(...nodes: DomNode[]): void {
    nodes.forEach((node) => {
      node.remove();
      node.parentElement = this;
      this.children.push(node);
    });
  }

  public replaceChildren(...nodes: DomNode[]): void {
    this.children.forEach((child) => (child.parentElement = null));
    this.children = [];
    this.append(...nodes);
  }

  public before(node: DomNode): void {
    node.remove();
    const parent = this.parentElement;
    if (parent !== null) {
      node.parentElement = parent;
      parent.children.splice(parent.children.indexOf(this), 0, node);
    }
  }

  public replaceWith(node: DomNode): void {
    this.before(node);
    this.remove();
  }

  public remove(): void {
    if (this.parentElement !== null) {
      this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
      this.parentElement = null;
    }
  }

  public setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  public removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  public getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  public hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  public toggleAttribute(name: string, force: boolean): boolean {
    if (force) {
      this.attributes.set(name, '');
    } else {
      this.attributes.delete(name);
    }
    return force;
  }

  public closest(selector: string): DomNode | null {
    const names = selector.split(',').map((part) => part.trim().slice(1, -1));
    if (names.some((name) => this.hasAttribute(name))) {
      return this;
    }
    return this.parentElement?.closest(selector) ?? null;
  }

  public addEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  public click(): void {
    this.bubble({ type: 'click', target: this } as unknown as Event);
  }

  public focus(): void {
    this.focused = true;
  }

  public querySelector(): DomNode | null {
    return null;
  }

  public bubble(event: Event): void {
    this.listeners.get(event.type)?.forEach((listener) => listener(event));
    this.parentElement?.bubble(event);
  }

  public descendants(): DomNode[] {
    return this.children.flatMap((child) => [child, ...child.descendants()]);
  }
}

export class DomDocument {
  public list = new DomNode('div', this);
  public parent = new DomNode('div', this);
  public defaultView: { localStorage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null; innerWidth?: number; innerHeight?: number; navigator?: { language: string } } | null = null;
  public listeners = new Map<string, Array<(event: Event) => void>>();

  constructor() {
    this.parent.append(this.list);
  }

  public addEventListener(type: string, listener: (event: Event) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  public removeEventListener(type: string, listener: (event: Event) => void): void {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((candidate) => candidate !== listener));
  }

  public emit(type: string, event: Record<string, unknown>): void {
    const full = { type, buttons: 0, ...event } as unknown as Event;
    this.listeners.get(type)?.forEach((listener) => listener(full));
  }

  public created: DomNode[] = [];

  public createElement(tagName: string): DomNode {
    const node = new DomNode(tagName, this);
    this.created.push(node);
    return node;
  }

  public createdPanel(): DomNode | undefined {
    return this.created.findLast((node) => node.hasAttribute('data-vivarcdi-preview') && node.parentElement !== null);
  }

  public querySelector(): DomNode | null {
    return this.list.parentElement === null ? null : this.list;
  }
}

export const asDocument = (document: DomDocument): Document => document as unknown as Document;
export const asElement = (node: DomNode): HTMLElement => node as unknown as HTMLElement;
