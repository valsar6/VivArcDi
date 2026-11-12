import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FavoriteDropZone } from '../../src/core/FavoriteDropZone.js';
import type { FavoriteDropTarget, FavoritePage, FavoriteTargets } from '../../src/core/FavoriteDropZone.js';

class RecordingTargets implements FavoriteTargets {
  public calls: string[] = [];

  public at(x: number, y: number): FavoriteDropTarget | null {
    this.calls.push(`at ${x},${y}`);
    return { place: 'here' };
  }

  public end(): FavoriteDropTarget | null {
    this.calls.push('end');
    return { place: 'end' };
  }

  public mark(target: FavoriteDropTarget | null): void {
    this.calls.push(target === null ? 'unmark' : 'mark');
  }

  public clear(): void {
    this.calls.push('clear');
  }

  public async drop(_target: FavoriteDropTarget, page: FavoritePage): Promise<boolean> {
    this.calls.push(`drop ${'url' in page ? page.url : 'tab'}`);
    return true;
  }
}

test('gives the same zone to the same scope', () => {
  const scope = {};
  assert.equal(FavoriteDropZone.of(scope), FavoriteDropZone.of(scope));
  assert.notEqual(FavoriteDropZone.of(scope), FavoriteDropZone.of({}));
});

test('has no place and drops nothing until the Favorites register', async () => {
  const zone = FavoriteDropZone.of({});
  assert.equal(zone.available, false);
  assert.equal(zone.at(1, 2), null);
  assert.equal(zone.end(), null);
  assert.equal(await zone.drop({}, { title: 'A', url: 'https://a.example/' }), false);
  zone.mark(null);
  zone.clear();
});

test('forwards to the registered places and forgets them when unregistered', async () => {
  const zone = FavoriteDropZone.of({});
  const targets = new RecordingTargets();
  const unregister = zone.register(targets);
  const target = zone.at(3, 4);
  assert.notEqual(target, null);
  zone.mark(target);
  zone.mark(null);
  zone.clear();
  assert.deepEqual(zone.end(), { place: 'end' });
  assert.equal(await zone.drop(target as FavoriteDropTarget, { title: 'A', url: 'https://a.example/' }), true);
  assert.deepEqual(targets.calls, ['at 3,4', 'mark', 'unmark', 'clear', 'end', 'drop https://a.example/']);
  unregister();
  assert.equal(zone.available, false);
  assert.equal(zone.at(3, 4), null);
});

test('an old registration cannot remove a newer one', () => {
  const zone = FavoriteDropZone.of({});
  const first = zone.register(new RecordingTargets());
  zone.register(new RecordingTargets());
  first();
  assert.equal(zone.available, true);
});
