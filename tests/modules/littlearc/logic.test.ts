import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AddressResolver } from '../../../src/modules/littlearc/AddressResolver.js';
import { DestinationPicker } from '../../../src/modules/littlearc/DestinationPicker.js';
import { ExternalLinkDetector } from '../../../src/modules/littlearc/ExternalLinkDetector.js';
import { FocusHistory } from '../../../src/modules/littlearc/FocusHistory.js';
import { IdleTimer } from '../../../src/modules/littlearc/IdleTimer.js';
import type { Scheduler } from '../../../src/modules/littlearc/IdleTimer.js';
import { commandFor } from '../../../src/modules/littlearc/LittleArcKeyMap.js';
import { adoptMessage, parseAdoptMessage } from '../../../src/modules/littlearc/LittleArcMessage.js';
import { LittleArcRegistry } from '../../../src/modules/littlearc/LittleArcRegistry.js';
import { LITTLE_ARC_DEFAULTS, settingsFrom } from '../../../src/modules/littlearc/LittleArcSettings.js';
import { WindowBounds } from '../../../src/modules/littlearc/WindowBounds.js';

test('address resolver tells URLs from searches', () => {
  assert.deepEqual(AddressResolver.resolve('https://example.com/a?b=1'), { kind: 'url', url: 'https://example.com/a?b=1' });
  assert.deepEqual(AddressResolver.resolve('example.com'), { kind: 'url', url: 'https://example.com' });
  assert.deepEqual(AddressResolver.resolve(' news.example.co.uk/today '), { kind: 'url', url: 'https://news.example.co.uk/today' });
  assert.deepEqual(AddressResolver.resolve('localhost:3000/app'), { kind: 'url', url: 'http://localhost:3000/app' });
  assert.deepEqual(AddressResolver.resolve('192.168.1.1'), { kind: 'url', url: 'http://192.168.1.1' });
  assert.deepEqual(AddressResolver.resolve('cinema times'), { kind: 'search', text: 'cinema times' });
  assert.deepEqual(AddressResolver.resolve('how to.com'), { kind: 'search', text: 'how to.com' });
  assert.deepEqual(AddressResolver.resolve('weather'), { kind: 'search', text: 'weather' });
  assert.equal(AddressResolver.resolve('   '), null);
});

const clockOf = (times: number[]): (() => number) => () => times.shift() ?? 0;

function historyWith(events: Array<[number, number]>): FocusHistory {
  const history = new FocusHistory(clockOf(events.map(([, at]) => at)));
  events.forEach(([windowId]) => history.record(windowId));
  return history;
}

const link = (changes: Partial<chrome.tabs.Tab> = {}): chrome.tabs.Tab =>
  ({ id: 5, windowId: 1, active: true, url: 'https://example.com/page', ...changes }) as chrome.tabs.Tab;

test('external link detector accepts a link that wakes the app', () => {
  const detector = new ExternalLinkDetector(historyWith([[-1, 1000], [1, 10000]]), () => false);
  assert.equal(detector.accepts(link(), 10025), true);
  assert.equal(detector.accepts(link({ url: undefined, pendingUrl: 'http://example.com' }), 10000), true);
  assert.equal(detector.accepts(link(), 9990), true);
});

test('external link detector rejects tabs that are not external links', () => {
  const woken = historyWith([[-1, 1000], [1, 10000]]);
  const detector = new ExternalLinkDetector(woken, (id) => id === 9);
  assert.equal(detector.accepts(link({ openerTabId: 3 }), 10010), false);
  assert.equal(detector.accepts(link({ active: false }), 10010), false);
  assert.equal(detector.accepts(link({ url: 'vivaldi://newtab' }), 10010), false);
  assert.equal(detector.accepts(link({ windowId: 9 }), 10010), false);
  assert.equal(detector.accepts(link(), 10500), false);
  const inFront = new ExternalLinkDetector(historyWith([[2, 1000], [1, 10000]]), () => false);
  assert.equal(inFront.accepts(link(), 10010), false);
  assert.equal(new ExternalLinkDetector(new FocusHistory(), () => false).accepts(link(), 0), false);
  assert.equal(new ExternalLinkDetector(historyWith([[-1, 1000]]), () => false).accepts(link(), 1000), false);
});

test('focus history keeps only the last two events', () => {
  const history = historyWith([[-1, 0], [-1, 5], [1, 10]]);
  assert.equal(history.broughtForwardNear(10, 100), true);
  const reversed = historyWith([[1, 0], [-1, 5]]);
  assert.equal(reversed.broughtForwardNear(5, 100), false);
});

class FakeScheduler implements Scheduler {
  public scheduled: Array<{ callback: () => void; delayMs: number }> = [];
  public cleared = 0;

  public set(callback: () => void, delayMs: number): unknown {
    this.scheduled.push({ callback, delayMs });
    return this.scheduled.length;
  }

  public clear(): void {
    this.cleared += 1;
  }
}

test('idle timer closes untouched windows', () => {
  const scheduler = new FakeScheduler();
  let closed = 0;
  const timer = new IdleTimer(6, () => (closed += 1), scheduler);
  timer.touch();
  timer.touch();
  assert.equal(scheduler.scheduled.length, 2);
  assert.equal(scheduler.cleared, 1);
  assert.equal(scheduler.scheduled[1]?.delayMs, 6 * 3_600_000);
  scheduler.scheduled[1]?.callback();
  assert.equal(closed, 1);
  timer.stop();
  assert.equal(scheduler.cleared, 2);
});

test('idle timer is off when set to zero', () => {
  for (const hours of [0, -1, Number.NaN]) {
    const scheduler = new FakeScheduler();
    const timer = new IdleTimer(hours, () => undefined, scheduler);
    timer.touch();
    timer.stop();
    assert.equal(scheduler.scheduled.length, 0);
  }
});

test('destination picker defaults to the most recent workspace', async () => {
  let asked = 0;
  const choose = async (): Promise<string | null> => {
    asked += 1;
    return 'work';
  };
  assert.equal(await new DestinationPicker(false, choose).pick('home', ['home', 'work']), 'home');
  assert.equal(await new DestinationPicker(false, choose).pick(null, ['home']), null);
  assert.equal(asked, 0);
  assert.equal(await new DestinationPicker(true, choose).pick('home', ['home', 'work']), 'work');
  assert.equal(await new DestinationPicker(true, choose).pick('home', []), 'home');
  assert.equal(await new DestinationPicker(true, async () => null).pick('home', ['home', 'work']), 'home');
});

type PressEvent = Record<'key', string> & Record<'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey', boolean>;

const press = (key: string, modifiers: Partial<Record<'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey', boolean>> = {}): PressEvent => ({
  key,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...modifiers,
});

test('little arc keys close, keep and clear', () => {
  assert.equal(commandFor(press('Escape'), true), 'close');
  assert.equal(commandFor(press('Escape'), false), 'clear');
  assert.equal(commandFor(press('w', { metaKey: true }), false), 'close');
  assert.equal(commandFor(press('O', { ctrlKey: true }), false), 'keep');
  assert.equal(commandFor(press('o'), false), null);
  assert.equal(commandFor(press('o', { metaKey: true, shiftKey: true }), false), null);
  assert.equal(commandFor(press('constructor', { metaKey: true }), false), null);
});

test('little arc messages are validated', () => {
  assert.deepEqual(parseAdoptMessage(adoptMessage(4, 7)), adoptMessage(4, 7));
  assert.equal(parseAdoptMessage({ type: 'other', action: 'adopt', tabId: 1, windowId: 2 }), null);
  assert.equal(parseAdoptMessage({ type: 'vivarcdi-little-arc', action: 'adopt', tabId: '1', windowId: 2 }), null);
  assert.equal(parseAdoptMessage(null), null);
});

test('registry remembers the marked windows and forgets the oldest', () => {
  const values = new Map<string, string>();
  const registry = new LittleArcRegistry({ getItem: (key): string | null => values.get(key) ?? null, setItem: (key, value): void => void values.set(key, value) });
  assert.equal(registry.has(3), false);
  registry.mark(3);
  registry.mark(3);
  assert.equal(registry.has(3), true);
  registry.unmark(3);
  assert.equal(registry.has(3), false);
  for (let id = 1; id <= 25; id += 1) {
    registry.mark(id);
  }
  assert.equal(registry.has(5), false);
  assert.equal(registry.has(25), true);
  values.set('vivarcdi.little-arc.windows', 'not json');
  assert.equal(registry.has(1), false);
});

test('settings are read with defaults and clamped sizes', () => {
  assert.deepEqual(settingsFrom({}), LITTLE_ARC_DEFAULTS);
  const custom = settingsFrom({ externalLinks: false, askWorkspace: true, idleCloseHours: -3, widthPercent: 5, heightPercent: 500 });
  assert.deepEqual(custom, { externalLinks: false, askWorkspace: true, idleCloseHours: 0, widthPercent: 20, heightPercent: 100 });
});

test('window bounds centre a share of the screen', () => {
  const bounds = WindowBounds.centred({ width: 1000, height: 800, left: 100, top: 20 }, { widthPercent: 50, heightPercent: 50 });
  assert.deepEqual(bounds, { width: 500, height: 400, left: 350, top: 220 });
});
