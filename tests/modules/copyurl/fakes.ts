import type { ClipboardWriter } from '../../../src/modules/copyurl/UrlCopier.js';
import type { ToastTimers } from '../../../src/core/Toast.js';
import { FakeElement } from '../peek/fakes.js';

export class FakeField extends FakeElement {
  public value = '';
  public selected = false;

  public select(): void {
    this.selected = true;
  }
}

export class FakeClipboard implements ClipboardWriter {
  public written: string[] = [];
  public refuse = false;

  public async writeText(text: string): Promise<void> {
    if (this.refuse) {
      throw new Error('Document is not focused');
    }
    this.written.push(text);
  }
}

export class CopyDocument {
  public body = new FakeElement('body');
  public root = new FakeElement('document');
  public elements: Record<string, FakeElement>;
  public activeElement: { focus(): void; focused: number } = { focused: 0, focus(): void { this.focused += 1; } };
  public commandWorks = true;
  public copiedFromField: string[] = [];
  public defaultView: { navigator: { clipboard: FakeClipboard | undefined } };

  constructor(elements: Record<string, FakeElement> = {}, clipboard: FakeClipboard | undefined = new FakeClipboard()) {
    this.elements = elements;
    this.defaultView = { navigator: { clipboard } };
  }

  public querySelector(selector: string): FakeElement | null {
    return this.elements[selector] ?? null;
  }

  public createElement(tagName: string): FakeElement {
    return tagName === 'textarea' ? new FakeField(tagName) : new FakeElement(tagName);
  }

  public execCommand(command: string): boolean {
    const field = this.body.children.find((child): child is FakeField => child instanceof FakeField && child.selected);
    if (command === 'copy' && this.commandWorks && field !== undefined) {
      this.copiedFromField.push(field.value);
      return true;
    }
    return false;
  }

  public addEventListener(type: string, listener: (event: Event) => void): void {
    this.root.addEventListener(type, listener);
  }

  public removeEventListener(type: string, listener: (event: Event) => void): void {
    this.root.removeEventListener(type, listener);
  }
}

export class ManualTimers implements ToastTimers {
  public pending = new Map<number, { run: () => void; delayMs: number }>();
  #next = 1;

  public set = (run: () => void, delayMs: number): number => {
    const handle = this.#next++;
    this.pending.set(handle, { run, delayMs });
    return handle;
  };

  public clear = (handle: unknown): void => {
    this.pending.delete(handle as number);
  };

  public fire(): void {
    const due = [...this.pending.values()];
    this.pending.clear();
    due.forEach(({ run }) => run());
  }
}

export const asDocument = (document: CopyDocument): Document => document as unknown as Document;
