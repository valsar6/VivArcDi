import { afterEach, beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import type { CallPagePolicy } from '../../src/modules/callpip/CallMessage.js';
import { CallVideo } from '../../src/page/lib/CallVideo.js';
import type { CallPageServices } from '../../src/page/lib/CallPipHook.js';
import { FakePictureEnvironment, cameras } from './pictureFakes.js';

interface PageScript {
  install(policy: CallPagePolicy, services?: CallPageServices): void;
  uninstall(): void;
  open(): void;
  close(): void;
}

interface Registered {
  type: string;
  listener: (event: unknown) => void;
}

interface Pressed {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
  repeat: boolean;
  prevented: boolean;
  stopped: boolean;
  preventDefault(): void;
  stopImmediatePropagation(): void;
}

const IN_CALL = '.in-call';
const TILE = '.tile';
const POLL_MS = 1000;

class FakeVideo {
  public paused = false;
  public ended = false;
  public disablePictureInPicture = true;
  public requested = 0;
  public refuse = false;
  public srcObject: { getVideoTracks(): Array<{ readyState: string }> } | null = { getVideoTracks: () => [{ readyState: 'live' }] };

  constructor(
    private readonly page: FakeDocument,
    private readonly width: number,
    private readonly height: number,
  ) {}

  public getBoundingClientRect(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  public requestPictureInPicture(): Promise<void> {
    this.requested += 1;
    if (this.refuse) {
      return Promise.reject(new Error('refused'));
    }
    this.page.pictureInPictureElement = this;
    return Promise.resolve();
  }
}

class FakeDocument {
  public hidden = false;
  public pictureInPictureEnabled = true;
  public pictureInPictureElement: FakeVideo | null = null;
  public videos: FakeVideo[] = [];
  public inCallView = true;
  public exits = 0;
  public listeners = new Map<string, Array<() => void>>();

  public querySelector(selector: string): object | null {
    return selector === IN_CALL && this.inCallView ? {} : null;
  }

  public tiles: unknown[] = [];

  public querySelectorAll(selector: string): unknown[] {
    if (selector === TILE) {
      return this.tiles;
    }
    return selector === 'video' ? this.videos : [];
  }

  public addEventListener(type: string, listener: () => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  public removeEventListener(type: string, listener: () => void): void {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((entry) => entry !== listener));
  }

  public exitPictureInPicture(): Promise<void> {
    this.exits += 1;
    this.pictureInPictureElement = null;
    return Promise.resolve();
  }

  public fire(type: string): void {
    (this.listeners.get(type) ?? []).forEach((listener) => listener());
  }
}

let live: Registered[] = [];
let sent: Array<{ reason?: string; token?: string }> = [];
let page = new FakeDocument();
let saved: Array<[string, PropertyDescriptor | undefined]> = [];
let activation = false;

const policy = (letter = 'p'): CallPagePolicy => ({
  token: 'tok',
  tabId: 7,
  letter,
  maxTiles: 9,
  selectors: { inCall: IN_CALL, tile: TILE, avatar: '.avatar', microphone: '.mic', camera: '.cam' },
});

function load(): Promise<PageScript> {
  return import('../../src/page/call-pip.js');
}

function press(fields: Partial<Pressed>): Pressed {
  const key: Pressed = {
    key: 'p',
    metaKey: true,
    ctrlKey: false,
    shiftKey: true,
    altKey: false,
    defaultPrevented: false,
    repeat: false,
    prevented: false,
    stopped: false,
    preventDefault(): void {
      key.prevented = true;
    },
    stopImmediatePropagation(): void {
      key.stopped = true;
    },
    ...fields,
  };
  live.filter((entry) => entry.type === 'keydown').forEach((entry) => entry.listener(key));
  return key;
}

const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  live = [];
  sent = [];
  page = new FakeDocument();
  const scope = globalThis as object;
  activation = false;
  saved = ['addEventListener', 'removeEventListener', 'chrome', 'document', 'navigator'].map((name) => [name, Object.getOwnPropertyDescriptor(scope, name)]);
  Reflect.defineProperty(scope, 'addEventListener', {
    configurable: true,
    value: (type: string, listener: (event: unknown) => void): void => void live.push({ type, listener }),
  });
  Reflect.defineProperty(scope, 'removeEventListener', {
    configurable: true,
    value: (type: string, listener: (event: unknown) => void): void => {
      live = live.filter((entry) => entry.type !== type || entry.listener !== listener);
    },
  });
  Reflect.defineProperty(scope, 'chrome', {
    configurable: true,
    value: { runtime: { sendMessage: (message: { reason?: string; token?: string }): void => void sent.push(message) } },
  });
  Reflect.defineProperty(scope, 'document', { configurable: true, value: page });
  Reflect.defineProperty(scope, 'navigator', { configurable: true, value: { userActivation: { get isActive(): boolean { return activation; } } } });
  mock.timers.enable({ apis: ['setInterval'] });
});

afterEach(async () => {
  (await load()).uninstall();
  mock.timers.reset();
  const scope = globalThis as object;
  for (const [name, descriptor] of saved) {
    Reflect.deleteProperty(scope, name);
    if (descriptor !== undefined) {
      Reflect.defineProperty(scope, name, descriptor);
    }
  }
  Reflect.deleteProperty(scope, Symbol.for('vivarcdi.call.pip'));
});

async function inCall(letter = 'p'): Promise<FakeVideo> {
  const video = new FakeVideo(page, 640, 360);
  page.videos = [video];
  (await load()).install(policy(letter));
  return video;
}

test('opens the call PiP on the shortcut', async () => {
  const video = await inCall();
  const key = press({});
  assert.equal(video.requested, 1);
  assert.equal(video.disablePictureInPicture, false);
  assert.ok(key.prevented && key.stopped);
  assert.equal(page.pictureInPictureElement, video);
});

test('closes the call PiP on the shortcut', async () => {
  await inCall();
  press({});
  const key = press({});
  assert.equal(page.exits, 1);
  assert.equal(page.pictureInPictureElement, null);
  assert.ok(key.prevented && key.stopped);
});

test('closes the call PiP when the page becomes visible', async () => {
  await inCall();
  press({});
  page.hidden = true;
  page.fire('visibilitychange');
  assert.equal(page.exits, 0);
  page.hidden = false;
  page.fire('visibilitychange');
  assert.equal(page.exits, 1);
});

test('closes the open PiP window on request', async () => {
  const script = await load();
  await inCall();
  press({});
  script.close();
  assert.equal(page.exits, 1);
  script.close();
  assert.equal(page.exits, 1);
});

test('closes the call PiP when the call ends', async () => {
  await inCall();
  press({});
  page.inCallView = false;
  mock.timers.tick(POLL_MS);
  assert.equal(page.exits, 0);
  mock.timers.tick(POLL_MS * 2);
  assert.equal(page.exits, 1);
});

test('ignores the shortcut without a call', async () => {
  const video = await inCall();
  page.inCallView = false;
  const lobby = press({});
  page.inCallView = true;
  video.paused = true;
  const paused = press({});
  assert.equal(video.requested, 0);
  assert.ok([lobby, paused].every((key) => !key.prevented && !key.stopped));
});

test('floats the largest live video', () => {
  const small = new FakeVideo(page, 100, 60);
  const biggestPaused = new FakeVideo(page, 900, 500);
  biggestPaused.paused = true;
  const biggestDead = new FakeVideo(page, 800, 450);
  biggestDead.srcObject = { getVideoTracks: (): Array<{ readyState: string }> => [{ readyState: 'ended' }] };
  const large = new FakeVideo(page, 640, 360);
  const noStream = new FakeVideo(page, 1000, 600);
  noStream.srcObject = null;
  page.videos = [small, biggestPaused, biggestDead, large, noStream];
  assert.equal(CallVideo.pick(page as unknown as ParentNode), large);
  page.videos = [biggestPaused, noStream];
  assert.equal(CallVideo.pick(page as unknown as ParentNode), null);
});

test('uses the configured shortcut letter', async () => {
  const video = await inCall('k');
  const old = press({});
  assert.equal(video.requested, 0);
  assert.equal(old.prevented, false);
  const configured = press({ key: 'K' });
  assert.equal(video.requested, 1);
  assert.equal(configured.prevented, true);
});

test('leaves an unexpected call page untouched', async () => {
  page.pictureInPictureEnabled = false;
  (await load()).install(policy());
  assert.equal(live.length, 0);
  assert.equal(page.listeners.size, 0);
  assert.deepEqual(sent.map((message) => message.reason), ['unsupported-page']);
  assert.equal(sent[0]?.token, 'tok');
});

test('warns once when the page refuses Picture in Picture', async () => {
  const video = await inCall();
  video.refuse = true;
  press({});
  press({});
  await settle();
  assert.deepEqual(sent.map((message) => message.reason), ['request-failed']);
});

test('ignores keys with other modifiers and keys already handled', async () => {
  const video = await inCall();
  const plain = press({ shiftKey: false });
  const withAlt = press({ altKey: true });
  const handled = press({ defaultPrevented: true });
  assert.equal(video.requested, 0);
  assert.ok([plain, withAlt, handled].every((key) => !key.prevented));
});

test('opens the call PiP on a tab switch after an interaction', async () => {
  const video = await inCall();
  page.hidden = true;
  activation = true;
  (await load()).open();
  assert.equal(video.requested, 1);
  assert.equal(page.pictureInPictureElement, video);
  assert.deepEqual(sent, []);
});

test('does not open the call PiP on a tab switch without a recent interaction', async () => {
  const video = await inCall();
  page.hidden = true;
  (await load()).open();
  page.inCallView = false;
  activation = true;
  (await load()).open();
  assert.equal(video.requested, 0);
  assert.deepEqual(sent, []);
});

test('ignores a held shortcut', async () => {
  const video = await inCall();
  press({});
  const held = [press({ repeat: true }), press({ repeat: true }), press({ repeat: true })];
  assert.equal(video.requested, 1);
  assert.equal(page.exits, 0);
  assert.ok(held.every((key) => key.prevented && key.stopped));
  page.inCallView = false;
  page.pictureInPictureElement = null;
  const outside = press({ repeat: true });
  assert.equal(outside.prevented, false);
});

test('keeps the call PiP open when the script is installed again', async () => {
  const video = await inCall();
  press({});
  (await load()).install(policy());
  assert.equal(page.exits, 0);
  assert.equal(page.pictureInPictureElement, video);
  assert.equal(live.filter((entry) => entry.type === 'keydown').length, 1);
  press({});
  assert.equal(page.exits, 1);
});

function fakeTile(): unknown {
  return {
    querySelectorAll: (selector: string): unknown[] => (selector === 'video' ? [{ videoWidth: 640, videoHeight: 360, paused: false, ended: false, srcObject: { getVideoTracks: (): Array<{ readyState: string }> => [{ readyState: 'live' }] } }] : []),
    getBoundingClientRect: (): { width: number; height: number } => ({ width: 146, height: 182 }),
  };
}

test('pages the tiles with the arrow keys', async () => {
  const environment = new FakePictureEnvironment();
  environment.onEnter = (): void => {
    page.pictureInPictureElement = environment.videos[0] as unknown as FakeVideo;
  };
  const handlers = new Map<string, (() => void) | null>();
  const services: CallPageServices = {
    environment,
    mediaSession: { setActionHandler: (action, handler): void => void handlers.set(action, handler) },
    observe: () => () => undefined,
  };
  page.tiles = cameras(12).map(fakeTile);
  page.videos = [new FakeVideo(page, 640, 360)];
  (await load()).install(policy(), services);
  const arrow = (key: string, fields: Partial<Pressed> = {}): Pressed => press({ key, metaKey: false, shiftKey: false, ...fields });
  const before = arrow('ArrowRight');
  assert.equal(before.prevented, false);
  press({});
  await settle();
  assert.equal(page.pictureInPictureElement, environment.videos[0]);
  assert.ok(handlers.get('nexttrack'));
  const moved = arrow('ArrowRight');
  assert.ok(moved.prevented && moved.stopped);
  const modified = arrow('ArrowLeft', { shiftKey: true });
  assert.equal(modified.prevented, false);
  const other = arrow('ArrowDown');
  assert.equal(other.prevented, false);
  press({});
  assert.equal(page.exits, 1);
  environment.videos[0]?.leave();
  assert.equal(arrow('ArrowLeft').prevented, false);
  assert.equal(handlers.get('nexttrack'), null);
});
