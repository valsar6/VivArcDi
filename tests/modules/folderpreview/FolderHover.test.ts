import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FolderHover } from '../../../src/modules/folderpreview/FolderHover.js';
import { FolderLinks } from '../../../src/modules/folderpreview/FolderLinks.js';
import { DomDocument, asDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';
import { bookmarkTree, folder, link } from '../folders/fakes.js';

function setup(): { dom: DomDocument; hover: FolderHover; events: string[]; run: () => void; rows: Record<string, DomNode>; panel: DomNode; outside: DomNode } {
  const dom = new DomDocument();
  const events: string[] = [];
  let pending: (() => void) | null = null;
  const hover = new FolderHover(
    asDocument(dom),
    400,
    { onOpen: (id): void => void events.push(`open ${id}`), onClose: (): void => void events.push('close') },
    {
      set: (run): unknown => {
        pending = run;
        return run;
      },
      clear: (): void => {
        pending = null;
      },
    },
  );
  hover.start();
  const row = (id: string, open = false): DomNode => {
    const node = dom.createElement('div');
    node.setAttribute('data-vivarcdi-folder-id', id);
    node.toggleAttribute('data-vivarcdi-open', open);
    return node;
  };
  const panel = dom.createElement('div');
  panel.setAttribute('data-vivarcdi-preview', '');
  return { dom, hover, events, run: (): void => {
      const task = pending;
      pending = null;
      task?.();
    }, rows: { a: row('a'), b: row('b'), open: row('o', true) }, panel, outside: dom.createElement('div') };
}

test('opens after the pointer rests on a closed folder and closes after it leaves', () => {
  const { dom, events, run, rows, panel, outside } = setup();
  dom.emit('mouseover', { target: rows['a'] });
  assert.deepEqual(events, []);
  run();
  assert.deepEqual(events, ['open a']);

  dom.emit('mouseover', { target: panel });
  run();
  assert.deepEqual(events, ['open a']);

  dom.emit('mouseover', { target: outside });
  run();
  assert.deepEqual(events, ['open a', 'close']);
});

test('ignores expanded folders and presses of the mouse button', () => {
  const { dom, events, run, rows } = setup();
  dom.emit('mouseover', { target: rows['open'] });
  run();
  dom.emit('mouseover', { target: rows['a'], buttons: 1 });
  run();
  assert.deepEqual(events, []);
});

test('moves to another folder and stops listening on stop', () => {
  const { dom, hover, events, run, rows } = setup();
  dom.emit('mouseover', { target: rows['a'] });
  run();
  dom.emit('mouseover', { target: rows['b'] });
  run();
  assert.deepEqual(events, ['open a', 'open b']);
  hover.stop();
  dom.emit('mouseover', { target: rows['a'] });
  run();
  assert.deepEqual(events, ['open a', 'open b']);
});

test('lists the links of a folder and of its subfolders in folder order', () => {
  const tree = bookmarkTree([
    folder('10', 'Hobbies', [link('11', 'Chess', 'https://chess.com/'), folder('12', 'Nix', [link('13', 'Manual', 'https://nixos.org/manual')]), link('14', 'Script', 'javascript:void(0)')]),
  ]);
  const content = FolderLinks.find(tree, '12');
  assert.deepEqual(content?.links.map((entry) => entry.title), ['Manual']);
  const all = FolderLinks.find(tree, '10');
  assert.equal(all?.title, 'Hobbies');
  assert.deepEqual(all?.links.map((entry) => entry.title), ['Chess', 'Manual']);
  assert.equal(FolderLinks.find(tree, 'missing'), null);
});
