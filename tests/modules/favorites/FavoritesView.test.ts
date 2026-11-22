import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FavoritesView } from '../../../src/modules/favorites/FavoritesView.js';
import type { Favorite } from '../../../src/modules/favorites/FavoritesFolder.js';
import { ROWS_DRAWN_EVENT } from '../../../src/shared/links/InPlaceEditor.js';
import { DomDocument, asDocument } from '../../core/dom.js';

const favorite = (id: string): Favorite => ({ id, title: `Site ${id}`, url: `https://site-${id}.test/` });

test('tells an open field that the tiles were drawn again', () => {
  const document = new DomDocument();
  const view = new FavoritesView(asDocument(document), { open: (): void => undefined, unload: (): void => undefined });
  let drawn = 0;
  document.addEventListener(ROWS_DRAWN_EVENT, () => void (drawn += 1));
  view.show([favorite('1')]);
  assert.equal(drawn, 1);
});
