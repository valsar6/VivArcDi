import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LinkDropZone } from '../../src/core/LinkDropZone.js';
import type { LinkDropTarget, LinkPage, LinkTargets } from '../../src/core/LinkDropZone.js';

class RecordingTargets implements LinkTargets {
  public calls: string[] = [];

  public at(x: number, y: number): LinkDropTarget | null {
    this.calls.push(`at ${x},${y}`);
    return { place: 'here' };
  }

  public end(): LinkDropTarget | null {
    this.calls.push('end');
    return { place: 'end' };
  }

  public mark(target: LinkDropTarget | null): void {
    this.calls.push(target === null ? 'unmark' : 'mark');
  }

  public clear(): void {
    this.calls.push('clear');
  }

  public async drop(_target: LinkDropTarget, page: LinkPage): Promise<boolean> {
    this.calls.push(`drop ${'url' in page ? page.url : 'tab'}`);
    return true;
  }
}

test('gives the same zone to the same scope', () => {
  const scope = {};
  assert.equal(LinkDropZone.of(scope), LinkDropZone.of(scope));
  assert.notEqual(LinkDropZone.of(scope), LinkDropZone.of({}));
});

test('has no place and drops nothing until a section registers', async () => {
  const zone = LinkDropZone.of({});
  assert.equal(zone.available, false);
  assert.equal(zone.at(1, 2), null);
  assert.equal(zone.end(), null);
  assert.equal(await zone.drop({}, { title: 'A', url: 'https://a.example/' }), false);
  zone.mark(null);
  zone.clear();
});

test('forwards to the registered places and forgets them when unregistered', async () => {
  const zone = LinkDropZone.of({});
  const targets = new RecordingTargets();
  const unregister = zone.register(targets);
  const target = zone.at(3, 4);
  assert.notEqual(target, null);
  zone.mark(target);
  zone.mark(null);
  zone.clear();
  assert.deepEqual(zone.end(), { place: 'end' });
  assert.equal(await zone.drop(target as LinkDropTarget, { title: 'A', url: 'https://a.example/' }), true);
  assert.deepEqual(targets.calls, ['at 3,4', 'mark', 'unmark', 'clear', 'end', 'drop https://a.example/']);
  unregister();
  assert.equal(zone.available, false);
  assert.equal(zone.at(3, 4), null);
});

test('an old registration cannot remove a newer one', () => {
  const zone = LinkDropZone.of({});
  const first = zone.register(new RecordingTargets());
  zone.register(new RecordingTargets());
  first();
  assert.equal(zone.available, true);
});
