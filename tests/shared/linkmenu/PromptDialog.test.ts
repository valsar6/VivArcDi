import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIALOG_ATTRIBUTE, PromptDialog } from '../../../src/shared/linkmenu/PromptDialog.js';
import type { PromptOptions } from '../../../src/shared/linkmenu/PromptDialog.js';
import { asDocument, DomDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';

const FIELD = 'data-vivarcdi-dialog-field';
const CONFIRM = 'data-vivarcdi-dialog-confirm';
const CANCEL = 'data-vivarcdi-dialog-cancel';
const ALERT = 'data-vivarcdi-dialog-alert';

interface Setup {
  dom: DomDocument;
  dialog: PromptDialog;
  open: () => DomNode | undefined;
  part: (name: string) => DomNode;
}

const OPTIONS: PromptOptions = { title: 'Edit Pinned URL', text: 'Opens first.', label: 'URL', value: 'https://a.test/', confirm: 'Save' };

function setUp(): Setup {
  const dom = new DomDocument();
  const dialog = new PromptDialog({ document: asDocument(dom), parent: (): Element => dom.parent as unknown as Element });
  const open = (): DomNode | undefined => dom.created.find((node) => node.hasAttribute(DIALOG_ATTRIBUTE) && node.parentElement !== null);
  const part = (name: string): DomNode => {
    const found = open()
      ?.descendants()
      .find((node) => node.hasAttribute(name));
    assert.ok(found, name);
    return found;
  };
  return { dom, dialog, open, part };
}

const press = (node: DomNode, key: string): void => {
  node.bubble({ type: 'keydown', key, target: node, preventDefault: (): void => undefined, stopPropagation: (): void => undefined } as unknown as Event);
};

const escape = (dom: DomDocument): void =>
  dom.emit('keydown', { key: 'Escape', preventDefault: (): void => undefined, stopPropagation: (): void => undefined });

test('opens a dialog with the title, text and label, the field focused and selected', () => {
  const { dialog, open, part } = setUp();
  void dialog.ask(OPTIONS);
  assert.equal(part('data-vivarcdi-dialog-box').getAttribute('role'), 'dialog');
  const texts = open()?.descendants().map((node) => node.textContent) ?? [];
  assert.ok(texts.includes('Edit Pinned URL'));
  assert.ok(texts.includes('Opens first.'));
  assert.ok(texts.includes('URL'));
  assert.equal(part(FIELD).value, 'https://a.test/');
  assert.equal(part(FIELD).focused, true);
  assert.equal(part(FIELD).selected, true);
  assert.equal(part(CONFIRM).textContent, 'Save');
});

test('resolves the trimmed value on Enter and closes', async () => {
  const { dialog, open, part } = setUp();
  const answer = dialog.ask(OPTIONS);
  part(FIELD).value = '  https://b.test/  ';
  press(part(FIELD), 'Enter');
  assert.equal(await answer, 'https://b.test/');
  assert.equal(open(), undefined);
});

test('resolves the value on the confirm button', async () => {
  const { dialog, part } = setUp();
  const answer = dialog.ask(OPTIONS);
  part(CONFIRM).click();
  assert.equal(await answer, 'https://a.test/');
});

test('resolves null on Esc, Cancel and a click on the backdrop', async () => {
  const first = setUp();
  const byKey = first.dialog.ask(OPTIONS);
  escape(first.dom);
  assert.equal(await byKey, null);
  assert.equal(first.open(), undefined);

  const second = setUp();
  const byButton = second.dialog.ask(OPTIONS);
  second.part(CANCEL).click();
  assert.equal(await byButton, null);

  const third = setUp();
  const byBackdrop = third.dialog.ask(OPTIONS);
  third.open()?.click();
  assert.equal(await byBackdrop, null);
});

test('a click inside the dialog does not cancel it', () => {
  const { dialog, open, part } = setUp();
  void dialog.ask(OPTIONS);
  part(FIELD).click();
  assert.notEqual(open(), undefined);
});

test('stays open with the field marked and the reason read out on an invalid value', async () => {
  const { dialog, open, part } = setUp();
  const answer = dialog.ask({ ...OPTIONS, validate: (value) => (value === 'ok' ? null : 'Enter a valid address') });
  part(FIELD).value = 'bad';
  part(CONFIRM).click();
  assert.notEqual(open(), undefined);
  assert.equal(part(FIELD).getAttribute('aria-invalid'), 'true');
  assert.equal(part(FIELD).hasAttribute('data-vivarcdi-invalid'), true);
  assert.equal(part(ALERT).getAttribute('role'), 'alert');
  assert.equal(part(ALERT).textContent, 'Enter a valid address');
  part(FIELD).value = 'ok';
  part(CONFIRM).click();
  assert.equal(await answer, 'ok');
});

test('typing clears the invalid mark', () => {
  const { dialog, part } = setUp();
  void dialog.ask({ ...OPTIONS, validate: () => 'No' });
  part(CONFIRM).click();
  part(FIELD).bubble({ type: 'input', target: part(FIELD) } as unknown as Event);
  assert.equal(part(FIELD).hasAttribute('aria-invalid'), false);
  assert.equal(part(FIELD).hasAttribute('data-vivarcdi-invalid'), false);
  assert.equal(part(ALERT).textContent, '');
});

test('a second ask cancels the first and only one dialog is open', async () => {
  const { dom, dialog } = setUp();
  const first = dialog.ask(OPTIONS);
  void dialog.ask(OPTIONS);
  assert.equal(await first, null);
  assert.equal(dom.created.filter((node) => node.hasAttribute(DIALOG_ATTRIBUTE) && node.parentElement !== null).length, 1);
});

test('stops listening once the dialog is closed', async () => {
  const { dom, dialog } = setUp();
  const answer = dialog.ask(OPTIONS);
  escape(dom);
  await answer;
  assert.equal([...dom.listeners.values()].flat().length, 0);
});
