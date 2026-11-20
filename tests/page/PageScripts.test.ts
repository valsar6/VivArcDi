import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

interface PageScript {
  install(argument: never): void;
  uninstall(): void;
}

interface Registered {
  type: string;
  listener: (event: unknown) => void;
  capture: boolean;
}

interface Case {
  name: string;
  event: string;
  argument: (token: string) => unknown;
}

const TRIGGERS = { shiftClick: true, pinnedCrossSite: true, anyCrossSite: false, pinnedNewTab: true, anyNewTab: false };
const KEYED = (token: string): unknown => ({ token, tabId: 1 });

const CASES: Case[] = [
  { name: 'peek-links', event: 'click', argument: (token) => ({ triggers: TRIGGERS, pinned: false, tabId: 1, token }) },
  { name: 'peek-keys', event: 'keydown', argument: (token) => token },
  { name: 'pinned-keys', event: 'keydown', argument: KEYED },
  { name: 'copy-keys', event: 'keydown', argument: KEYED },
  { name: 'archive-keys', event: 'keydown', argument: (token) => token },
  { name: 'call-pip', event: 'keydown', argument: (token) => ({ token, tabId: 1, letter: 'p', inCallSelector: '.in-call' }) },
];

const KEYS = ['vivarcdi.peek.links', 'vivarcdi.peek.keys', 'vivarcdi.pinned.keys', 'vivarcdi.copy.keys', 'vivarcdi.archive.keys', 'vivarcdi.call.pip'];
const SCRIPT_FOLDER = fileURLToPath(new URL('../../src/page/', import.meta.url));

let live: Registered[] = [];
let sent: unknown[] = [];
let saved: Array<[string, PropertyDescriptor | undefined]> = [];

function load(name: string): Promise<PageScript> {
  return import(`../../src/page/${name}.js`) as Promise<PageScript>;
}

beforeEach(() => {
  live = [];
  sent = [];
  const scope = globalThis as object;
  saved = ['addEventListener', 'removeEventListener', 'chrome', 'document'].map((name) => [name, Object.getOwnPropertyDescriptor(scope, name)]);
  Reflect.defineProperty(scope, 'addEventListener', {
    configurable: true,
    value: (type: string, listener: (event: unknown) => void, capture: boolean): void => {
      live.push({ type, listener, capture });
    },
  });
  Reflect.defineProperty(scope, 'removeEventListener', {
    configurable: true,
    value: (type: string, listener: (event: unknown) => void, capture: boolean): void => {
      live = live.filter((entry) => entry.type !== type || entry.listener !== listener || entry.capture !== capture);
    },
  });
  Reflect.defineProperty(scope, 'document', {
    configurable: true,
    value: {
      hidden: false,
      pictureInPictureEnabled: true,
      pictureInPictureElement: null,
      querySelector: (): null => null,
      querySelectorAll: (): never[] => [],
      addEventListener: (): void => undefined,
      removeEventListener: (): void => undefined,
    },
  });
  Reflect.defineProperty(scope, 'chrome', {
    configurable: true,
    value: { runtime: { sendMessage: (message: unknown): void => void sent.push(message) } },
  });
});

afterEach(() => {
  const scope = globalThis as object;
  for (const [name, descriptor] of saved) {
    Reflect.deleteProperty(scope, name);
    if (descriptor !== undefined) {
      Reflect.defineProperty(scope, name, descriptor);
    }
  }
  for (const key of KEYS) {
    Reflect.deleteProperty(scope, Symbol.for(key));
  }
});

test('every page script exports install and uninstall', async () => {
  const names = readdirSync(SCRIPT_FOLDER)
    .filter((file) => file.endsWith('.ts'))
    .map((file) => file.slice(0, -'.ts'.length));
  assert.deepEqual([...names].sort(), CASES.map((entry) => entry.name).sort());
  for (const name of names) {
    const script = await load(name);
    assert.equal(typeof script.install, 'function', name);
    assert.equal(typeof script.uninstall, 'function', name);
  }
});

test('a second install replaces the first', async () => {
  for (const entry of CASES) {
    const script = await load(entry.name);
    script.install(entry.argument('old') as never);
    script.install(entry.argument('new') as never);
    assert.equal(live.length, 1, entry.name);
    assert.equal(live[0]?.type, entry.event, entry.name);
    assert.equal(live[0]?.capture, true, entry.name);
    script.uninstall();
  }
});

test('uninstall leaves the page as before', async () => {
  for (const entry of CASES) {
    const script = await load(entry.name);
    script.install(entry.argument('t') as never);
    script.uninstall();
    assert.equal(live.length, 0, entry.name);
    assert.equal(Reflect.get(globalThis, Symbol.for(KEYS[CASES.indexOf(entry)] ?? '')), undefined, entry.name);
  }
});

test('uninstall without install does nothing', async () => {
  for (const entry of CASES) {
    const script = await load(entry.name);
    script.uninstall();
    script.uninstall();
    assert.equal(live.length, 0, entry.name);
  }
});

test('peek keys use the newest token', async () => {
  const script = await load('peek-keys');
  script.install('old' as never);
  script.install('new' as never);
  assert.equal(live.length, 1);
  const calls: string[] = [];
  const event = {
    key: 'Escape',
    metaKey: false,
    ctrlKey: false,
    preventDefault: (): void => void calls.push('prevent'),
    stopImmediatePropagation: (): void => void calls.push('stop'),
  };
  live[0]?.listener(event);
  assert.deepEqual(calls, ['prevent', 'stop']);
  assert.equal(sent.length, 1);
  assert.equal((sent[0] as { token: string }).token, 'new');
});
