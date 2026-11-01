import type { BrowserRuntime } from '../../../src/core/BrowserRuntime.js';
import type { FrameTiming } from '../../../src/core/FrameTask.js';
import { DomDocument, DomNode } from '../../core/dom.js';

export class FieldNode extends DomNode {
  public override selected = false;

  public override select(): void {
    this.selected = true;
  }
}

export class ButtonNode extends DomNode {
  public clicks = 0;

  public override click(): void {
    this.clicks += 1;
  }
}

export class BrowserNode extends DomNode {
  public dataset: Record<string, string> = {};
}

/** A document with Vivaldi's browser root, an address field that tests can show late, and buttons found by selector. */
export class IncognitoDocument extends DomDocument {
  public browser = new BrowserNode('div', this);
  public field: FieldNode | null = null;
  public found = new Map<string, DomNode[]>();

  public override querySelector(selector?: string): DomNode | null {
    if (selector === '#browser') {
      return this.browser;
    }
    return selector === 'input.address' ? this.field : super.querySelector();
  }

  public querySelectorAll(selector: string): DomNode[] {
    if (selector.startsWith('[')) {
      return [...this.found.values()].flat().filter((node) => node.hasAttribute(selector.slice(1, -1)));
    }
    return this.found.get(selector) ?? [];
  }

  public button(title: string): ButtonNode {
    const button = new ButtonNode('button', this);
    button.setAttribute('title', title);
    this.found.set('button[title]', [...(this.found.get('button[title]') ?? []), button]);
    return button;
  }

  public vivaldiButton(selector: string): DomNode {
    const node = new DomNode('button', this);
    this.found.set(selector, [...(this.found.get(selector) ?? []), node]);
    return node;
  }
}

/** Frames that run only when the test says so. */
export class ManualFrames {
  public waiting: Array<() => void> = [];
  public scheduled = 0;

  public readonly timing: FrameTiming = {
    schedule: (run) => {
      this.scheduled += 1;
      this.waiting.push(run);
      return run;
    },
    cancel: (handle) => {
      this.waiting = this.waiting.filter((run) => run !== handle);
    },
  };

  public next(): void {
    this.waiting.shift()?.();
  }
}

export const runtimeOf = (windowId: number, privateWindow = true): BrowserRuntime =>
  ({ currentWindowId: async () => windowId, isPrivateWindow: async () => privateWindow }) as unknown as BrowserRuntime;
