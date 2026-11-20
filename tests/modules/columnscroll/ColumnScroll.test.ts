import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ModuleContext } from '../../../src/core/boot/Module.js';
import { SelectorCatalog } from '../../../src/core/dom/SelectorCatalog.js';
import { Logger } from '../../../src/core/support/Logger.js';
import { COLUMN_SCROLL_ATTRIBUTE, ColumnMark } from '../../../src/modules/columnscroll/ColumnMark.js';
import { ColumnScroll } from '../../../src/modules/columnscroll/ColumnScroll.js';
import { asDocument, DomNode } from '../../core/dom.js';

class ColumnDocument {
  public elements = new Map<string, DomNode>();
  public watchers: Array<() => void> = [];
  public frames: Array<() => void> = [];

  public querySelector(selector: string): DomNode | null {
    return this.elements.get(selector) ?? null;
  }

  public add(selector: string): DomNode {
    const node = new DomNode('div', this as never);
    this.elements.set(selector, node);
    return node;
  }

  public change(): void {
    this.watchers.forEach((watcher) => watcher());
    this.frames.splice(0).forEach((run) => run());
  }
}

function markOf(document: ColumnDocument): ColumnMark {
  return new ColumnMark(
    asDocument(document as never),
    { column: '#column', verticalBar: '#vertical' },
    (_target, onChange) => {
      document.watchers.push(onChange);
      return (): void => void document.watchers.splice(0);
    },
    { schedule: (run) => document.frames.push(run) },
  );
}

test('leaves the column untouched when the selectors do not match', () => {
  const document = new ColumnDocument();
  const column = document.add('#column');
  const warnings: unknown[][] = [];
  const logger = new Logger('test', { info: (): void => undefined, error: (): void => undefined, warn: (...message: unknown[]): void => void warnings.push(message) });
  const context = { document: asDocument(document as never), selectors: new SelectorCatalog({}, 'test'), logger } as unknown as ModuleContext;
  new ColumnScroll().start(context);
  assert.equal(column.hasAttribute(COLUMN_SCROLL_ATTRIBUTE), false);
  assert.equal(warnings.length, 1);
});

test('marks the column of a vertical tab bar and removes the mark on stop', () => {
  const document = new ColumnDocument();
  const column = document.add('#column');
  document.add('#vertical');
  const mark = markOf(document);
  mark.start();
  assert.equal(column.hasAttribute(COLUMN_SCROLL_ATTRIBUTE), true);
  mark.stop();
  assert.equal(column.hasAttribute(COLUMN_SCROLL_ATTRIBUTE), false);
});

test('does not mark the column of a horizontal tab bar', () => {
  const document = new ColumnDocument();
  const column = document.add('#column');
  markOf(document).start();
  assert.equal(column.hasAttribute(COLUMN_SCROLL_ATTRIBUTE), false);
});

test('marks the new column when Vivaldi builds another one', () => {
  const document = new ColumnDocument();
  const first = document.add('#column');
  document.add('#vertical');
  markOf(document).start();
  const second = document.add('#column');
  document.change();
  assert.equal(first.hasAttribute(COLUMN_SCROLL_ATTRIBUTE), false);
  assert.equal(second.hasAttribute(COLUMN_SCROLL_ATTRIBUTE), true);
});
