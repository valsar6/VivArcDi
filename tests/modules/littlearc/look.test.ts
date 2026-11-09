import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Logger } from '../../../src/core/Logger.js';
import { AddressDisplay } from '../../../src/modules/littlearc/AddressDisplay.js';
import { BackButtonState } from '../../../src/modules/littlearc/BackButtonState.js';
import { DestinationLookup } from '../../../src/modules/littlearc/DestinationLookup.js';
import type { LookupRuntime } from '../../../src/modules/littlearc/DestinationLookup.js';
import { DestinationPalette } from '../../../src/modules/littlearc/DestinationPalette.js';
import { KeepLabel } from '../../../src/modules/littlearc/KeepLabel.js';
import { destinationAnswer, isDestinationQuestion, parseDestinationAnswer } from '../../../src/modules/littlearc/LittleArcMessage.js';
import { PopupChrome } from '../../../src/modules/littlearc/PopupChrome.js';
import { SilentSink } from '../../loader/fakes.js';

const logger = new Logger('test', new SilentSink());
const colors = { space: '#111111', pill: '#222222', ink: '#eeeeee' };

test('address display shows the host of a loaded page', () => {
  assert.equal(AddressDisplay.of('https://www.weather.com/today?x=1'), 'weather.com');
  assert.equal(AddressDisplay.of('http://news.example.co.uk/a'), 'news.example.co.uk');
  assert.equal(AddressDisplay.of('https://www.www.example.com'), 'www.example.com');
  assert.equal(AddressDisplay.of('http://localhost:3000/app'), 'localhost:3000');
  assert.equal(AddressDisplay.of('about:blank'), '');
  assert.equal(AddressDisplay.of('vivaldi://newtab'), '');
  assert.equal(AddressDisplay.of('not an address'), '');
  assert.equal(AddressDisplay.of(''), '');
  assert.equal(AddressDisplay.of(undefined), '');
});

test('back button appears after the first navigation', () => {
  const state = new BackButtonState();
  assert.equal(state.visible, false);
  state.record('about:blank');
  state.record('https://example.com/');
  assert.equal(state.visible, false);
  state.record('https://example.com/');
  state.record(undefined);
  state.record('vivaldi://newtab');
  assert.equal(state.visible, false);
  state.record('https://example.com/next');
  assert.equal(state.visible, true);
  state.record('about:blank');
  assert.equal(state.visible, true);
});

test('keep label names the destination workspace', () => {
  assert.deepEqual(KeepLabel.of('Personale', 'MacIntel'), { prefix: 'Open in', name: 'Personale', shortcut: '⌘O' });
  assert.deepEqual(KeepLabel.of('Lavoro', 'Linux x86_64'), { prefix: 'Open in', name: 'Lavoro', shortcut: 'Ctrl+O' });
  assert.equal(KeepLabel.of(null, 'MacIntel').name, 'workspace');
  assert.equal(KeepLabel.of('  ', 'Linux').name, 'workspace');
  assert.equal(KeepLabel.of(undefined, '').shortcut, 'Ctrl+O');
});

test('destination messages keep the name and the colors', () => {
  assert.equal(isDestinationQuestion({ type: 'vivarcdi-little-arc', action: 'destination' }), true);
  assert.equal(isDestinationQuestion({ type: 'vivarcdi-little-arc', action: 'adopt' }), false);
  assert.equal(isDestinationQuestion(null), false);
  assert.deepEqual(parseDestinationAnswer(destinationAnswer('Lavoro', colors)), destinationAnswer('Lavoro', colors));
  assert.deepEqual(parseDestinationAnswer(destinationAnswer(null, null)), destinationAnswer(null, null));
  assert.equal(parseDestinationAnswer({ type: 'other', action: 'destination-answer' }), null);
  assert.equal(parseDestinationAnswer('text'), null);
  assert.equal(parseDestinationAnswer(destinationAnswer('A', { space: '#000', pill: '#111', ink: '#222' }))?.colors?.ink, '#222');
});

class FakeRuntime {
  public sent: unknown[] = [];
  public listeners = new Set<(message: unknown) => void>();
  #reply: unknown;

  constructor(reply: unknown) {
    this.#reply = reply;
  }

  public readonly messagesAvailable = true;

  public onMessage(listener: (message: unknown) => void): () => void {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  }

  public async sendMessage(message: unknown): Promise<void> {
    this.sent.push(message);
    if (this.#reply !== undefined) {
      this.listeners.forEach((listener) => listener(this.#reply));
    }
  }
}

test('destination lookup waits for the answer and gives up after the timeout', async () => {
  const answered = new FakeRuntime(destinationAnswer('Lavoro', colors));
  const answer = await new DestinationLookup(answered, logger, 20).ask();
  assert.equal(answer?.name, 'Lavoro');
  assert.deepEqual(answered.sent, [{ type: 'vivarcdi-little-arc', action: 'destination' }]);
  assert.equal(answered.listeners.size, 0);
  const silent = new FakeRuntime(undefined);
  assert.equal(await new DestinationLookup(silent, logger, 5).ask(), null);
  assert.equal(silent.listeners.size, 0);
  const missing = { messagesAvailable: false } as unknown as LookupRuntime;
  assert.equal(await new DestinationLookup(missing, logger, 5).ask(), null);
});

class FakeRoot {
  public values = new Map<string, string>();
  public style = {
    getPropertyValue: (name: string): string => this.values.get(name) ?? '',
    setProperty: (name: string, value: string): void => void this.values.set(name, value),
    removeProperty: (name: string): void => void this.values.delete(name),
  };
}

test('destination palette reads, applies and clears the look variables', () => {
  const root = new FakeRoot() as unknown as HTMLElement;
  assert.equal(DestinationPalette.read(root), null);
  assert.equal(DestinationPalette.read(null), null);
  DestinationPalette.apply(root, colors);
  assert.deepEqual(DestinationPalette.read(root), colors);
  DestinationPalette.clear(root);
  assert.equal(DestinationPalette.read(root), null);
});

class FakePart {
  public attributes = new Set<string>();
  public children: FakePart[] = [];

  public contains(other: FakePart): boolean {
    return this === other || this.children.includes(other);
  }

  public setAttribute(name: string): void {
    this.attributes.add(name);
  }

  public removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
}

test('popup chrome marks what the catalog matches and nothing else', () => {
  const header = new FakePart();
  const page = new FakePart();
  const root = new FakePart();
  const bar = new FakePart();
  root.children = [bar];
  const found: Record<string, FakePart[]> = { '.header': [header, root], '#page': [page] };
  const document = {
    querySelectorAll: (selector: string): FakePart[] => {
      if (selector === '[data-vivarcdi-popup-header]') {
        return [header, root].filter((part) => part.attributes.has('data-vivarcdi-popup-header'));
      }
      if (selector === 'bad[') {
        throw new Error('invalid selector');
      }
      return found[selector] ?? [];
    },
  } as unknown as Pick<Document, 'querySelectorAll'>;
  const selectors = (popupHeader: string | null, container: string | null): ConstructorParameters<typeof PopupChrome>[1] => {
    const known = new Map([['popupHeader', popupHeader], ['webviewContainer', container]]);
    return { has: (name: string): boolean => known.get(name) !== null && known.has(name), get: (name: string): string => known.get(name) ?? '' };
  };
  const chrome = new PopupChrome(document, selectors('.header', '#page'), logger);
  chrome.mark(bar as unknown as Element);
  assert.equal(header.attributes.has('data-vivarcdi-popup-header'), true);
  assert.equal(root.attributes.size, 0);
  assert.equal(page.attributes.has('data-vivarcdi-popup-page'), true);
  chrome.unmark();
  assert.equal(header.attributes.size, 0);
  const none = new PopupChrome(document, selectors(null, null), logger);
  none.mark(bar as unknown as Element);
  const invalid = new PopupChrome(document, selectors('bad[', null), logger);
  invalid.mark(bar as unknown as Element);
  invalid.mark(bar as unknown as Element);
});
