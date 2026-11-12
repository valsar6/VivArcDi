import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EDITOR_ATTRIBUTE, RepositoryEditor } from '../../../src/modules/livefolders/RepositoryEditor.js';
import { asDocument, DomDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';

function setup(): { dom: DomDocument; editor: RepositoryEditor; saved: string[][]; element: () => DomNode | undefined } {
  const dom = new DomDocument();
  const saved: string[][] = [];
  const editor = new RepositoryEditor({ document: asDocument(dom), parent: (): Element => dom.parent as unknown as Element });
  editor.open(5, 6, ['acme/web'], (repositories) => void saved.push(repositories));
  return { dom, editor, saved, element: (): DomNode | undefined => dom.created.findLast((node) => node.hasAttribute(EDITOR_ATTRIBUTE) && node.parentElement !== null) };
}

const buttons = (element: DomNode | undefined): DomNode[] => (element?.children ?? []).filter((child) => child.tagName === 'BUTTON');
const field = (element: DomNode | undefined): DomNode => (element?.children ?? []).find((child) => child.tagName === 'TEXTAREA') as DomNode;

test('shows the repositories one per line at the point', () => {
  const { element } = setup();
  assert.equal(field(element()).value, 'acme/web');
  assert.equal(element()?.properties.get('left'), '5px');
  assert.equal(element()?.properties.get('top'), '6px');
  assert.deepEqual(buttons(element()).map((button) => button.textContent), ['Cancel', 'Save']);
});

test('saves the valid names and closes', () => {
  const { element, saved } = setup();
  const editor = element();
  field(editor).value = 'acme/web\nnonsense\nvalsar6/VivArcDi';
  buttons(editor)[1]?.click();
  assert.deepEqual(saved, [['acme/web', 'valsar6/VivArcDi']]);
  assert.equal(element(), undefined);
});

test('saves an empty list when the field is cleared', () => {
  const { element, saved } = setup();
  field(element()).value = '';
  buttons(element())[1]?.click();
  assert.deepEqual(saved, [[]]);
});

test('closes without saving on Cancel, Escape and a click elsewhere', () => {
  const cancel = setup();
  buttons(cancel.element())[0]?.click();
  assert.equal(cancel.element(), undefined);

  const escape = setup();
  escape.dom.emit('keydown', { key: 'Escape', preventDefault: (): void => undefined, stopPropagation: (): void => undefined });
  assert.equal(escape.element(), undefined);

  const elsewhere = setup();
  elsewhere.dom.emit('mousedown', { button: 0, target: elsewhere.dom.createElement('div') });
  assert.equal(elsewhere.element(), undefined);
  assert.deepEqual([cancel.saved, escape.saved, elsewhere.saved], [[], [], []]);
});

test('stays open on a click inside and stops listening once closed', () => {
  const { dom, editor, element } = setup();
  dom.emit('mousedown', { button: 0, target: field(element()) });
  assert.notEqual(element(), undefined);
  editor.close();
  assert.equal([...dom.listeners.values()].flat().length, 0);
});
