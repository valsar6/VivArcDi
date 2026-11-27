import { afterEach, beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import type { CallWarning } from '../../src/modules/callpip/CallMessage.js';
import { CallControls } from '../../src/page/lib/CallControls.js';
import type { MediaSessionLike } from '../../src/page/lib/CallControls.js';
import { CallTiles } from '../../src/page/lib/CallTiles.js';
import type { CallTile } from '../../src/page/lib/CallTiles.js';
import { PipPicture } from '../../src/page/lib/PipPicture.js';
import { ComposedPipSource } from '../../src/page/lib/PipSource.js';
import type { PipSource } from '../../src/page/lib/PipSource.js';
import { TileLayout } from '../../src/page/lib/TileLayout.js';
import type { PlacedTile } from '../../src/page/lib/TileLayout.js';
import { TilePager } from '../../src/page/lib/TilePager.js';
import { FakePictureEnvironment, HEIGHT, SILHOUETTE, WIDTH, avatarTile, cameraTile, cameras, screenTile, video } from './pictureFakes.js';

const FRAME_MS = 66;
const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));
const areaOf = (placed: PlacedTile): number => placed.rect.width * placed.rect.height;

beforeEach(() => mock.timers.enable({ apis: ['setInterval'] }));
afterEach(() => mock.timers.reset());

interface Floating {
  environment: FakePictureEnvironment;
  source: ComposedPipSource;
  tiles: CallTile[];
  pagers: TilePager[];
  closed: number;
  warnings: CallWarning[];
  fallbacks: number;
}

function floating(tiles: CallTile[], maxTiles = 9): Floating {
  const state = { environment: new FakePictureEnvironment(), tiles, pagers: [] as TilePager[], closed: 0, warnings: [] as CallWarning[], fallbacks: 0 };
  const fallback: PipSource = {
    open: (): boolean => {
      state.fallbacks += 1;
      return true;
    },
    release: (): void => undefined,
  };
  const source = new ComposedPipSource({
    environment: state.environment,
    read: (): CallTile[] => state.tiles,
    maxTiles,
    fallback,
    observer: { opened: (pager): void => void state.pagers.push(pager), closed: (): void => void (state.closed += 1) },
    warn: (reason): void => void state.warnings.push(reason),
  });
  return Object.assign(state, { source });
}

test('floats the shared screen and the participants together', async () => {
  const screen = screenTile();
  const others = cameras(3);
  const own = cameraTile();
  const run = floating([screen, ...others, own]);
  assert.equal(run.source.open(), true);
  await settle();
  const { context } = run.environment;
  [screen, ...others, own].forEach((tile) => assert.equal(context.drawn(tile.video).length, 1));
  assert.equal(run.environment.videos[0]?.entered, 1);
  assert.equal(run.environment.videos[0]?.disablePictureInPicture, false);
  assert.equal(run.pagers.length, 1);
});

test('gives the shared screen the larger area', () => {
  const screen = screenTile();
  const pager = new TilePager(9, () => [...cameras(4), screen]);
  const page = pager.current();
  assert.equal(page.primary, screen);
  const placed = TileLayout.place(page, WIDTH, HEIGHT);
  const primary = placed.find((entry) => entry.tile === screen);
  assert.ok(primary);
  placed.filter((entry) => entry !== primary).forEach((entry) => assert.ok(areaOf(primary) > areaOf(entry)));
});

test('lays the cameras out in a grid without a presentation', () => {
  const pager = new TilePager(9, () => cameras(4));
  const page = pager.current();
  assert.equal(page.primary, null);
  const placed = TileLayout.place(page, WIDTH, HEIGHT);
  assert.equal(placed.length, 4);
  assert.ok(placed.every((entry) => entry.rect.width === WIDTH / 2 && entry.rect.height === HEIGHT / 2));
  assert.equal(new Set(placed.map((entry) => `${entry.rect.x},${entry.rect.y}`)).size, 4);
});

test('shows the avatar of a participant without a live video', async () => {
  const tile = avatarTile('https://avatars.example/a');
  const run = floating([cameraTile(), tile]);
  run.source.open();
  await settle();
  const image = run.environment.images[0];
  assert.ok(image);
  assert.equal(image.src, 'https://avatars.example/a');
  assert.equal(image.crossOrigin, 'use-credentials');
  assert.equal(run.environment.context.silhouettes().length, 1);
  assert.equal(run.environment.context.drawn(image).length, 0);
  image.load();
  mock.timers.tick(FRAME_MS);
  assert.equal(run.environment.context.drawn(image).length, 1);
});

test('shows the own tile with the camera off', async () => {
  const own = avatarTile('https://avatars.example/me');
  const run = floating([own, ...cameras(2)]);
  run.source.open();
  await settle();
  assert.deepEqual(
    run.environment.images.map((image) => image.src),
    ['https://avatars.example/me'],
  );
  assert.equal(run.environment.context.silhouettes().length, 1);
});

test('updates the picture while the window is open', async () => {
  const first = cameraTile();
  const run = floating([screenTile(), first]);
  run.source.open();
  await settle();
  const joined = cameraTile();
  run.tiles = [...run.tiles, joined];
  mock.timers.tick(FRAME_MS);
  assert.equal(run.environment.context.drawn(joined.video).length, 1);
  run.tiles = run.tiles.filter((tile) => tile !== first);
  const before = run.environment.context.drawn(first.video).length;
  mock.timers.tick(FRAME_MS);
  assert.equal(run.environment.context.drawn(first.video).length, before);
  assert.equal(run.environment.videos[0]?.removed, false);
  assert.equal(run.closed, 0);
});

test('falls back to the largest video when the picture fails', async () => {
  const run = floating(cameras(2));
  run.environment.failCapture = true;
  assert.equal(run.source.open(), true);
  await settle();
  assert.deepEqual(run.warnings, ['composition-failed']);
  assert.equal(run.fallbacks, 1);
  assert.equal(run.environment.videos[0]?.removed, true);
  assert.equal(run.closed, 1);
});

test('falls back to the largest video when the page has no tiles', () => {
  const run = floating([]);
  assert.equal(run.source.open(), true);
  assert.equal(run.fallbacks, 1);
  assert.deepEqual(run.warnings, []);
});

test('limits the picture to the configured number of tiles', () => {
  const many = cameras(12);
  assert.equal(new TilePager(9, () => many).current().others.length, 9);
  const screen = screenTile();
  const withScreen = new TilePager(9, () => [...many, screen]).current();
  assert.equal(withScreen.primary, screen);
  assert.deepEqual(withScreen.others, many.slice(0, 8));
});

test('pages the tiles with the previous and next actions', () => {
  const many = cameras(12);
  const handlers = new Map<string, (() => void) | null>();
  const session: MediaSessionLike = { setActionHandler: (action, handler): void => void handlers.set(action, handler) };
  const controls = new CallControls({ root: { querySelector: (): null => null } as unknown as ParentNode, selectors: SELECTORS, session, observe: (): (() => void) => () => undefined, warn: (): void => undefined });
  const pager = new TilePager(9, () => many);
  controls.opened(pager);
  handlers.get('nexttrack')?.();
  assert.deepEqual(pager.current().others, many.slice(9));
  handlers.get('previoustrack')?.();
  assert.deepEqual(pager.current().others, many.slice(0, 9));
});

test('stops the paging at the first and last page', () => {
  const many = cameras(12);
  const pager = new TilePager(9, () => many);
  pager.previous();
  assert.deepEqual(pager.current().others, many.slice(0, 9));
  pager.next();
  pager.next();
  pager.next();
  assert.deepEqual(pager.current().others, many.slice(9));
  pager.previous();
  assert.deepEqual(pager.current().others, many.slice(0, 9));
});

test('keeps refreshing the picture while the page is hidden', async () => {
  const environment = new FakePictureEnvironment();
  const refreshed = new PipPicture(environment, new TilePager(9, () => cameras(2)));
  await refreshed.open();
  const start = environment.context.frames();
  mock.timers.tick(1000);
  assert.ok(environment.context.frames() - start >= 15);
  refreshed.dispose();
  const stopped = environment.canvases[0]?.context.frames() ?? 0;
  mock.timers.tick(1000);
  assert.equal(environment.canvases[0]?.context.frames(), stopped);
  assert.equal(environment.canvases[0]?.stream.stopped, 1);
  assert.equal(environment.videos[0]?.removed, true);
});

const SELECTORS = { inCall: '.leave', microphone: '.mic', camera: '.cam' };

class FakeButton {
  public clicks = 0;
  public muted: string | null = 'false';

  public click(): void {
    this.clicks += 1;
  }

  public getAttribute(name: string): string | null {
    return name === 'data-is-muted' ? this.muted : null;
  }
}

interface Controlled {
  controls: CallControls;
  handlers: Map<string, (() => void) | null>;
  buttons: Record<string, FakeButton>;
  active: { microphone: boolean[]; camera: boolean[] };
  changes: Array<() => void>;
  warnings: CallWarning[];
}

function controlled(present = true): Controlled {
  const buttons = { '.leave': new FakeButton(), '.mic': new FakeButton(), '.cam': new FakeButton() };
  const handlers = new Map<string, (() => void) | null>();
  const active = { microphone: [] as boolean[], camera: [] as boolean[] };
  const changes: Array<() => void> = [];
  const warnings: CallWarning[] = [];
  const session: MediaSessionLike = {
    setActionHandler: (action, handler): void => void handlers.set(action, handler),
    setMicrophoneActive: (value): void => void active.microphone.push(value),
    setCameraActive: (value): void => void active.camera.push(value),
  };
  const root = { querySelector: (selector: string): FakeButton | null => (present ? (buttons[selector as keyof typeof buttons] ?? null) : null) } as unknown as ParentNode;
  const controls = new CallControls({
    root,
    selectors: SELECTORS,
    session,
    observe: (_element, onChange): (() => void) => {
      changes.push(onChange);
      return (): void => undefined;
    },
    warn: (reason): void => void warnings.push(reason),
  });
  return { controls, handlers, buttons, active, changes, warnings };
}

test('registers the call actions', () => {
  const { controls, handlers } = controlled();
  controls.opened(new TilePager(9, () => cameras(2)));
  assert.deepEqual([...handlers.keys()].sort(), ['hangup', 'nexttrack', 'previoustrack', 'togglecamera', 'togglemicrophone']);
  assert.ok([...handlers.values()].every((handler) => typeof handler === 'function'));
  controls.closed();
  assert.ok([...handlers.values()].every((handler) => handler === null));
});

test('drives the call controls from the window', () => {
  const { controls, handlers, buttons } = controlled();
  controls.opened(new TilePager(9, () => cameras(2)));
  handlers.get('togglemicrophone')?.();
  handlers.get('togglecamera')?.();
  handlers.get('togglecamera')?.();
  handlers.get('hangup')?.();
  assert.deepEqual([buttons['.mic']?.clicks, buttons['.cam']?.clicks, buttons['.leave']?.clicks], [1, 2, 1]);
});

test('reports the microphone and camera state', () => {
  const { controls, buttons, active, changes } = controlled();
  buttons['.cam']!.muted = 'true';
  controls.opened(new TilePager(9, () => cameras(2)));
  assert.deepEqual(active, { microphone: [true], camera: [false] });
  buttons['.mic']!.muted = 'true';
  buttons['.cam']!.muted = 'false';
  changes.forEach((change) => change());
  assert.deepEqual(active, { microphone: [true, false], camera: [false, true] });
});

test('warns when a call control is not found', () => {
  const { controls, handlers, warnings, active } = controlled(false);
  controls.opened(new TilePager(9, () => cameras(2)));
  handlers.get('hangup')?.();
  handlers.get('togglemicrophone')?.();
  assert.deepEqual(warnings, ['control-not-found', 'control-not-found']);
  assert.deepEqual(active, { microphone: [], camera: [] });
});

test('ignores the arrows without an open window and other keys', () => {
  const { controls } = controlled();
  assert.equal(controls.page('ArrowRight'), false);
  controls.opened(new TilePager(9, () => cameras(12)));
  assert.equal(controls.page('ArrowDown'), false);
  assert.equal(controls.page('ArrowRight'), true);
  assert.equal(controls.page('ArrowLeft'), true);
  controls.closed();
  assert.equal(controls.page('ArrowLeft'), false);
});

test('reads one tile per participant with its live video or its avatar', () => {
  const live = Object.assign(video(), { paused: false, ended: false, srcObject: { getVideoTracks: (): Array<{ readyState: string }> => [{ readyState: 'live' }] } });
  const frozen = Object.assign(video(), { paused: false, ended: false, srcObject: { getVideoTracks: (): Array<{ readyState: string; muted: boolean }> => [{ readyState: 'live', muted: true }] } });
  const image = (src: string, naturalWidth: number): object => ({ src, naturalWidth });
  const tile = (videos: object[], images: object[], width: number, height: number): object => ({
    querySelectorAll: (selector: string): object[] => (selector === 'video' ? videos : images),
    getBoundingClientRect: (): object => ({ width, height }),
  });
  const root = { querySelectorAll: (selector: string): object[] => (selector === '.tile' ? [tile([live], [], 670, 436), tile([frozen], [image('small', 50), image('large', 320)], 146, 182), tile([], [], 146, 182)] : []) };
  const tiles = CallTiles.read(root as unknown as ParentNode, { tile: '.tile', avatar: '.avatar' });
  assert.equal(tiles.length, 3);
  assert.deepEqual(tiles.map((entry) => [entry.video !== null, entry.avatar, entry.area]), [
    [true, null, 670 * 436],
    [false, 'large', 146 * 182],
    [false, null, 146 * 182],
  ]);
});

test('uses the silhouette colour for a tile without a picture', async () => {
  const environment = new FakePictureEnvironment();
  const picture = new PipPicture(environment, new TilePager(9, () => [{ video: null, avatar: null, area: 100 }]));
  await picture.open();
  assert.equal(environment.context.silhouettes().length, 1);
  assert.equal(SILHOUETTE, '#9aa0a6');
  picture.dispose();
});
