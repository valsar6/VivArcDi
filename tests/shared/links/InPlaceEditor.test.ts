import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InPlaceEditor, type EditTarget } from '../../../src/shared/links/InPlaceEditor.js';
import { DomDocument, type DomNode, asDocument, asElement } from '../../core/dom.js';

interface Rig {
  document: DomDocument;
  parent: DomNode;
  editor: InPlaceEditor;
}

const rig = (): Rig => {
  const document = new DomDocument();
  const editor = new InPlaceEditor({ document: asDocument(document), parent: (): Element => document.parent as unknown as Element });
  return { document, parent: document.parent, editor };
};

const makeAnchor = (rig: Rig, rect: { left: number; right: number; top: number; bottom: number }): DomNode => {
  const anchor = rig.document.createElement('div');
  anchor.rect = rect;
  Object.defineProperty(anchor, 'isConnected', { value: true, writable: true });
  return anchor;
};

const targetOf = (anchor: DomNode, covers: boolean): EditTarget => ({ anchor: asElement(anchor), covers });

const fieldOf = (rig: Rig): DomNode => {
  const field = rig.document.created.findLast((node) => node.tagName === 'INPUT' && node.parentElement !== null);
  assert.ok(field !== undefined);
  return field;
};

interface Pressed {
  stopped: boolean;
  prevented: boolean;
}

const press = (field: DomNode, key: string): Pressed => {
  const state = { stopped: false, prevented: false };
  field.bubble({ type: 'keydown', key, stopPropagation: (): void => void (state.stopped = true), preventDefault: (): void => void (state.prevented = true) } as unknown as Event);
  return state;
};

const blur = (field: DomNode): void => field.bubble({ type: 'blur' } as unknown as Event);

const rect = { left: 20, right: 180, top: 100, bottom: 124 };

test('opens a focused field over the anchor with the text selected', () => {
  const r = rig();
  const anchor = makeAnchor(r, rect);
  void r.editor.edit({ target: targetOf(anchor, true), value: 'Mail', label: 'Name' });
  const field = fieldOf(r);
  assert.equal(field.value, 'Mail');
  assert.equal(field.focused, true);
  assert.equal(field.selected, true);
  assert.equal(field.parentElement, r.parent);
  assert.equal(field.getAttribute('aria-label'), 'Name');
  assert.equal(field.hasAttribute('data-vivarcdi-inline-editor'), true);
  assert.equal(field.properties.get('left'), '20px');
  assert.equal(field.properties.get('top'), '100px');
  assert.equal(field.properties.get('width'), '160px');
  assert.equal(field.properties.get('height'), '24px');
});

test('resolves the trimmed text on Enter', async () => {
  const r = rig();
  const result = r.editor.edit({ target: targetOf(makeAnchor(r, rect), true), value: 'Mail', label: 'Name' });
  const field = fieldOf(r);
  field.value = '  Work mail  ';
  press(field, 'Enter');
  assert.equal(await result, 'Work mail');
  assert.equal(field.parentElement, null);
});

test('resolves an empty text when the field is emptied', async () => {
  const r = rig();
  const result = r.editor.edit({ target: targetOf(makeAnchor(r, rect), true), value: 'Mail', label: 'Name' });
  const field = fieldOf(r);
  field.value = '   ';
  press(field, 'Enter');
  assert.equal(await result, '');
});

test('resolves null on Escape', async () => {
  const r = rig();
  const result = r.editor.edit({ target: targetOf(makeAnchor(r, rect), true), value: 'Mail', label: 'Name' });
  const field = fieldOf(r);
  field.value = 'Other';
  press(field, 'Escape');
  assert.equal(await result, null);
  assert.equal(field.parentElement, null);
});

test('resolves the text on a click elsewhere', async () => {
  const r = rig();
  const result = r.editor.edit({ target: targetOf(makeAnchor(r, rect), true), value: 'Mail', label: 'Name' });
  const field = fieldOf(r);
  field.value = 'Kept';
  blur(field);
  assert.equal(await result, 'Kept');
});

test('resolves only once when the removed field blurs', async () => {
  const r = rig();
  const result = r.editor.edit({ target: targetOf(makeAnchor(r, rect), true), value: 'Mail', label: 'Name' });
  const field = fieldOf(r);
  press(field, 'Escape');
  field.value = 'Late';
  blur(field);
  assert.equal(await result, null);
});

test('a second edit cancels the first', async () => {
  const r = rig();
  const first = r.editor.edit({ target: targetOf(makeAnchor(r, rect), true), value: 'One', label: 'Name' });
  const firstField = fieldOf(r);
  const second = r.editor.edit({ target: targetOf(makeAnchor(r, rect), true), value: 'Two', label: 'Name' });
  assert.equal(await first, null);
  assert.equal(firstField.parentElement, null);
  const secondField = fieldOf(r);
  assert.notEqual(secondField, firstField);
  press(secondField, 'Enter');
  assert.equal(await second, 'Two');
});

test('cancel resolves null and removes the field', async () => {
  const r = rig();
  const result = r.editor.edit({ target: targetOf(makeAnchor(r, rect), true), value: 'Mail', label: 'Name' });
  const field = fieldOf(r);
  r.editor.cancel();
  assert.equal(await result, null);
  assert.equal(field.parentElement, null);
  r.editor.cancel();
});

test('reposition follows a moved anchor', () => {
  const r = rig();
  const anchor = makeAnchor(r, rect);
  void r.editor.edit({ target: targetOf(anchor, true), value: 'Mail', label: 'Name' });
  const field = fieldOf(r);
  anchor.rect = { left: 40, right: 140, top: 200, bottom: 230 };
  r.editor.reposition();
  assert.equal(field.properties.get('left'), '40px');
  assert.equal(field.properties.get('top'), '200px');
  assert.equal(field.properties.get('width'), '100px');
  assert.equal(field.properties.get('height'), '30px');
});

test('reposition cancels when the anchor is gone', async () => {
  const r = rig();
  const anchor = makeAnchor(r, rect);
  const result = r.editor.edit({ target: targetOf(anchor, true), value: 'Mail', label: 'Name' });
  const field = fieldOf(r);
  Object.defineProperty(anchor, 'isConnected', { value: false });
  r.editor.reposition();
  assert.equal(await result, null);
  assert.equal(field.parentElement, null);
});

test('reposition does nothing when no field is open', () => {
  const r = rig();
  r.editor.reposition();
  assert.equal(r.document.created.length, 0);
});

test('the field is no-drag and stops the keys', () => {
  const r = rig();
  void r.editor.edit({ target: targetOf(makeAnchor(r, rect), true), value: 'Mail', label: 'Name' });
  const field = fieldOf(r);
  assert.equal(field.properties.get('-webkit-app-region'), 'no-drag');
  assert.equal(press(field, 'a').stopped, true);
  assert.equal(press(field, 'Enter').prevented, true);
});

test('a field for a tile sits under the anchor', () => {
  const r = rig();
  const anchor = makeAnchor(r, { left: 100, right: 144, top: 50, bottom: 94 });
  void r.editor.edit({ target: targetOf(anchor, false), value: 'Mail', label: 'Name' });
  const field = fieldOf(r);
  assert.equal(field.properties.get('width'), '160px');
  assert.equal(field.properties.get('left'), '42px');
  assert.equal(field.properties.get('top'), '98px');
  assert.equal(field.getAttribute('data-vivarcdi-inline-editor'), 'below');
});
