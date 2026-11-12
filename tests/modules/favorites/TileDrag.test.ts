import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE_ATTRIBUTE } from '../../../src/modules/favorites/FavoritesView.js';
import type { GridTarget } from '../../../src/modules/favorites/GridDropZone.js';
import { MOVING_ATTRIBUTE, TileDrag } from '../../../src/modules/favorites/TileDrag.js';
import { asElement, DomDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';

const GRID_BOTTOM = 100;

class Scene {
  public calls: string[] = [];
  public document = new DomDocument();
  public grid: DomNode = this.document.createElement('div');
  public drag: TileDrag;

  constructor() {
    ['11', '12', '13'].forEach((id) => {
      const tile = this.document.createElement('div');
      tile.setAttribute(TILE_ATTRIBUTE, id);
      this.grid.append(tile);
    });
    const at = (_x: number, y: number): GridTarget | null => (y < GRID_BOTTOM ? { beforeId: '13' } : null);
    this.drag = new TileDrag({
      grid: (): HTMLElement => asElement(this.grid),
      zone: { at, mark: (target): number => this.calls.push(`mark ${String(target?.beforeId)}`), clear: (): number => this.calls.push('zone clear') },
      removal: {
        over: (): number => this.calls.push('removal over'),
        release: async (id): Promise<void> => void this.calls.push(`removal release ${id}`),
        clear: (): number => this.calls.push('removal clear'),
      },
      reorder: { move: async (id, beforeId): Promise<void> => void this.calls.push(`reorder ${id} ${String(beforeId)}`) },
    });
  }

  public moving(): string[] {
    return this.grid.children.filter((tile) => tile.hasAttribute(MOVING_ATTRIBUTE)).map((tile) => tile.getAttribute(TILE_ATTRIBUTE) ?? '');
  }
}

test('hides a dragged tile and opens the gap while it is over the grid', () => {
  const scene = new Scene();
  scene.drag.over('11', 10, 10);
  assert.deepEqual(scene.moving(), ['11']);
  assert.deepEqual(scene.calls, ['removal clear', 'mark 13']);
});

test('shows a dragged tile again and marks the removal places outside the grid', () => {
  const scene = new Scene();
  scene.drag.over('11', 10, 10);
  scene.calls = [];
  scene.drag.over('11', 10, GRID_BOTTOM + 50);
  assert.deepEqual(scene.moving(), []);
  assert.deepEqual(scene.calls, ['zone clear', 'removal over']);
});

test('reorders a tile released over the grid and removes one released elsewhere', async () => {
  const scene = new Scene();
  await scene.drag.release('11', 10, 10);
  await scene.drag.release('12', 10, GRID_BOTTOM + 50);
  assert.deepEqual(scene.calls, ['reorder 11 13', 'removal release 12']);
});

test('clears the gap, the marks and the hidden tile when the drag ends', () => {
  const scene = new Scene();
  scene.drag.over('12', 10, 10);
  scene.drag.clear();
  assert.deepEqual(scene.moving(), []);
  assert.deepEqual(scene.calls.slice(-2), ['zone clear', 'removal clear']);
});
