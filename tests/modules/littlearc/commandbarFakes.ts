type Handler = (event: Record<string, unknown>) => void;

interface Registered {
  handler: Handler;
  capture: boolean;
}

export class FakeNode {
  public tagName: string;
  public className = '';
  public textContent = '';
  public value = '';
  public type = '';
  public placeholder = '';
  public spellcheck = true;
  public focused = false;
  public parent: FakeNode | null = null;
  public children: FakeNode[] = [];
  public attributes = new Map<string, string>();
  public listeners = new Map<string, Registered[]>();

  constructor(tagName: string) {
    this.tagName = tagName;
  }

  public get isConnected(): boolean {
    return this.parent !== null;
  }

  public append(...nodes: FakeNode[]): void {
    nodes.forEach((node) => {
      node.remove();
      node.parent = this;
      this.children.push(node);
    });
  }

  public replaceChildren(...nodes: FakeNode[]): void {
    this.children.forEach((child) => (child.parent = null));
    this.children = [];
    this.append(...nodes);
  }

  public remove(): void {
    if (this.parent !== null) {
      this.parent.children = this.parent.children.filter((child) => child !== this);
      this.parent = null;
    }
  }

  public contains(node: FakeNode | null): boolean {
    return node === this || this.children.some((child) => child.contains(node));
  }

  public closest(selector: string): FakeNode | null {
    const name = /\[([\w-]+)\]/.exec(selector)?.[1] ?? '';
    return this.attributes.has(name) ? this : (this.parent?.closest(selector) ?? null);
  }

  public setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
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

  public addEventListener(type: string, handler: Handler, capture = false): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), { handler, capture }]);
  }

  public removeEventListener(type: string, handler: Handler, capture = false): void {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((entry) => entry.handler !== handler || entry.capture !== capture));
  }

  public listenerCount(): number {
    return [...this.listeners.values()].reduce((total, entries) => total + entries.length, 0);
  }

  public focus(): void {
    this.focused = true;
  }

  public descendants(): FakeNode[] {
    return this.children.flatMap((child) => [child, ...child.descendants()]);
  }

  public byClass(name: string): FakeNode[] {
    return this.descendants().filter((node) => node.className === name);
  }
}

export interface FakeEventRecord {
  type: string;
  target: FakeNode;
  prevented: boolean;
  stopped: boolean;
  [key: string]: unknown;
}

export function dispatch(target: FakeNode, type: string, init: Record<string, unknown> = {}): FakeEventRecord {
  const event: FakeEventRecord = {
    type,
    target,
    prevented: false,
    stopped: false,
    ...init,
    preventDefault: (): void => void (event.prevented = true),
    stopPropagation: (): void => void (event.stopped = true),
    stopImmediatePropagation: (): void => void (event.stopped = true),
  };
  const path: FakeNode[] = [];
  for (let node: FakeNode | null = target; node !== null; node = node.parent) {
    path.unshift(node);
  }
  const run = (node: FakeNode, capture: boolean): void => {
    (node.listeners.get(type) ?? []).filter((entry) => entry.capture === capture).forEach((entry) => entry.handler(event));
  };
  for (const node of path) {
    if (event.stopped) {
      return event;
    }
    run(node, true);
  }
  for (const node of [...path].reverse()) {
    if (event.stopped) {
      break;
    }
    run(node, false);
  }
  return event;
}

export class FakePage {
  public activeElement: FakeNode | null = null;
  public host = new FakeNode('div');
  public created: FakeNode[] = [];

  public createElement(tagName: string): FakeNode {
    const node = new FakeNode(tagName);
    this.created.push(node);
    return node;
  }

  public createElementNS(_namespace: string, tagName: string): FakeNode {
    return this.createElement(tagName);
  }

  public querySelector(): FakeNode {
    return this.host;
  }

  public querySelectorAll(): FakeNode[] {
    return [];
  }
}
