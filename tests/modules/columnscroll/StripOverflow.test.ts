import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StripOverflow, STRIP_OVERFLOW_PROPERTY } from '../../../src/modules/columnscroll/StripOverflow.js';

class Box {
  public scrollHeight = 0;
  public clientHeight = 0;
  public properties = new Map<string, string>();
  public style = {
    getPropertyValue: (name: string): string => this.properties.get(name) ?? '',
    setProperty: (name: string, value: string): void => void this.properties.set(name, value),
    removeProperty: (name: string): void => void this.properties.delete(name),
  };
}

class Window {
  public column = new Box();
  public strip = new Box();
  public watchers: Array<() => void> = [];
  public frames: Array<() => void> = [];

  public querySelector(selector: string): Box | null {
    return selector === '#column' ? this.column : selector === '#strip' ? this.strip : null;
  }

  public change(): void {
    this.watchers.forEach((watcher) => watcher());
    this.frames.splice(0).forEach((run) => run());
  }
}

function overflowOf(window: Window): StripOverflow {
  return new StripOverflow(
    window as unknown as Document,
    { column: '#column', strip: '#strip' },
    (_target, onChange) => {
      window.watchers.push(onChange);
      return (): void => void window.watchers.splice(0);
    },
    { schedule: (run) => window.frames.push(run) },
  );
}

test('sets the strip height on the column', () => {
  const window = new Window();
  window.strip.clientHeight = 658;
  window.strip.scrollHeight = 1353;
  overflowOf(window).start();
  assert.equal(window.column.properties.get(STRIP_OVERFLOW_PROPERTY), '695px');
});

test('updates the strip height when the tabs change', () => {
  const window = new Window();
  window.strip.clientHeight = 658;
  window.strip.scrollHeight = 1353;
  const overflow = overflowOf(window);
  overflow.start();
  window.strip.scrollHeight = 900;
  window.change();
  assert.equal(window.column.properties.get(STRIP_OVERFLOW_PROPERTY), '242px');
  window.strip.scrollHeight = 658;
  window.change();
  assert.equal(window.column.properties.get(STRIP_OVERFLOW_PROPERTY), '0px');
  overflow.stop();
  assert.equal(window.column.properties.has(STRIP_OVERFLOW_PROPERTY), false);
});
