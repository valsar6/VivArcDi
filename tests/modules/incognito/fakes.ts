import type { BrowserRuntime } from '../../../src/core/BrowserRuntime.js';
import type { FrameTiming } from '../../../src/core/FrameTask.js';
import { DomDocument, DomNode } from '../../core/dom.js';

export class FieldNode extends DomNode {
  public selected = false;

  public select(): void {
    this.selected = true;
  }
}

export class ButtonNode extends DomNode {
  public clicks = 0;

  public override click(): void {
    this.clicks += 1;
  }
}

/** A document that holds an address field, which tests can show late, and the buttons of the panel bar. */
export class IncognitoDocument extends DomDocument {
  public field: FieldNode | null = null;
  public buttons: ButtonNode[] = [];
  public queries: string[] = [];

  public override querySelector(selector?: string): DomNode | null {
    this.queries.push(String(selector));
    return selector === 'input.address' ? this.field : super.querySelector();
  }

  public querySelectorAll(): ButtonNode[] {
    return this.buttons;
  }

  public button(title: string): ButtonNode {
    const button = new ButtonNode('button', this);
    button.setAttribute('title', title);
    this.buttons.push(button);
    return button;
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
