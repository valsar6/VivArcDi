import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTIONS_ATTRIBUTE, CANCEL_LABEL, CHAR_ATTRIBUTE, CODE_ATTRIBUTE, ConnectPanel, COPY_LABEL, DASH_ATTRIBUTE, HEADER_ATTRIBUTE, HELP, HELP_ATTRIBUTE, PANEL_ATTRIBUTE, RETRY_LABEL, STATUS_ATTRIBUTE, TITLE, WAITING } from '../../../src/modules/livefolders/ConnectPanel.js';
import type { ConnectState } from '../../../src/modules/livefolders/ConnectFlow.js';
import { asDocument, DomDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';
import { ManualTimers } from './fakes.js';
import { settle } from '../reopen/fakes.js';

const CODE_STATE: ConnectState = { step: 'code', userCode: 'WDJB-MJHT', verificationUri: 'https://github.com/login/device' };

function setup(copyFails = false): {
  dom: DomDocument;
  panel: ConnectPanel;
  timers: ManualTimers;
  log: string[];
  show: (state: ConnectState) => void;
  element: () => DomNode | undefined;
} {
  const dom = new DomDocument();
  const timers = new ManualTimers();
  const log: string[] = [];
  let show: (state: ConnectState) => void = () => undefined;
  const panel = new ConnectPanel({
    document: asDocument(dom),
    parent: (): Element => dom.parent as unknown as Element,
    flow: {
      run: async (listener): Promise<void> => {
        show = listener;
        log.push('run');
      },
      cancel: (): void => void log.push('cancel'),
    },
    copier: { write: async (text): Promise<void> => (copyFails ? Promise.reject(new Error('refused')) : void log.push(`copy ${text}`)) },
    openPage: (url): void => void log.push(`open ${url}`),
    closeAfterMs: 2000,
    notify: (text, kind): void => void log.push(`toast ${kind ?? 'ok'} ${text}`),
    timers,
  });
  panel.open(5, 6);
  return { dom, panel, timers, log, show: (state): void => show(state), element: (): DomNode | undefined => dom.created.findLast((node) => node.hasAttribute(PANEL_ATTRIBUTE) && node.parentElement !== null) };
}

const buttons = (element: DomNode | undefined): DomNode[] => (element?.descendants() ?? []).filter((child) => child.tagName === 'BUTTON');
const texts = (element: DomNode | undefined): string[] =>
  (element?.children ?? []).flatMap((child) => (child.hasAttribute(ACTIONS_ATTRIBUTE) ? child.children.map((button) => button.textContent) : [child.textContent]));
const marked = (element: DomNode | undefined, attribute: string): DomNode[] => (element?.descendants() ?? []).filter((child) => child.hasAttribute(attribute));

test('opens at the point and starts connecting', () => {
  const { element, log, show } = setup();
  assert.deepEqual([element()?.properties.get('left'), element()?.properties.get('top')], ['5px', '6px']);
  assert.deepEqual(log, ['run']);
  show({ step: 'asking' });
  assert.deepEqual(texts(element()), [TITLE, 'Asking GitHub for a code…', 'Cancel']);
});

test('shows the code in large letters, with the copy button and Cancel', () => {
  const { element, show } = setup();
  show(CODE_STATE);
  assert.deepEqual(texts(element()), [TITLE, HELP, '', WAITING, COPY_LABEL, CANCEL_LABEL]);
  assert.equal(marked(element(), CODE_ATTRIBUTE).length, 1);
});

test('shows the header, the help line and the status of the connect panel', () => {
  const { element, show } = setup();
  show(CODE_STATE);
  assert.equal(marked(element(), HEADER_ATTRIBUTE)[0]?.textContent, 'Connect GitHub');
  assert.equal(marked(element(), HELP_ATTRIBUTE)[0]?.textContent, 'Paste this code on GitHub to connect your live folders.');
  assert.equal(marked(element(), STATUS_ATTRIBUTE)[0]?.textContent, 'Waiting for GitHub…');
});

test('draws the code with one box per character and the dash as a separator', () => {
  const { element, show } = setup();
  show(CODE_STATE);
  const code = marked(element(), CODE_ATTRIBUTE)[0];
  assert.deepEqual(code?.children.map((child) => child.textContent), ['W', 'D', 'J', 'B', '', 'M', 'J', 'H', 'T']);
  assert.equal(marked(element(), CHAR_ATTRIBUTE).length, 8);
  const dashes = marked(element(), DASH_ATTRIBUTE);
  assert.equal(dashes.length, 1);
  assert.equal(code?.children.indexOf(dashes[0] as DomNode), 4);
  assert.equal(dashes[0]?.hasAttribute(CHAR_ATTRIBUTE), false);
});

test('copies the code and opens the device page', async () => {
  const { element, show, log } = setup();
  show(CODE_STATE);
  buttons(element())[0]?.click();
  await settle();
  assert.deepEqual(log.filter((entry) => !entry.startsWith('toast')), ['run', 'copy WDJB-MJHT', 'open https://github.com/login/device']);
});

test('confirms the copied code with a toast', async () => {
  const { element, show, log } = setup();
  show(CODE_STATE);
  buttons(element())[0]?.click();
  await settle();
  assert.deepEqual(log, ['run', 'copy WDJB-MJHT', 'toast ok Code copied, paste it on GitHub', 'open https://github.com/login/device']);
});

test('confirms a cancelled connection with a toast', () => {
  const { element, show, log } = setup();
  show(CODE_STATE);
  buttons(element())[1]?.click();
  assert.deepEqual(log, ['run', 'cancel', 'toast neutral GitHub connection cancelled']);
});

test('opens the device page even when the copy is refused', async () => {
  const { element, show, log } = setup(true);
  show(CODE_STATE);
  buttons(element())[0]?.click();
  await settle();
  assert.deepEqual(log, ['run', 'open https://github.com/login/device']);
});

test('cancels the flow and closes on Cancel', () => {
  const { element, show, log } = setup();
  show(CODE_STATE);
  buttons(element())[1]?.click();
  assert.equal(element(), undefined);
  assert.deepEqual(log, ['run', 'cancel', 'toast neutral GitHub connection cancelled']);
});

test('closes on Escape and stays open on a click elsewhere', () => {
  const { dom, element, show, log } = setup();
  show(CODE_STATE);
  dom.emit('mousedown', { target: dom.parent });
  assert.notEqual(element(), undefined);
  let prevented = 0;
  element()?.bubble({ type: 'keydown', key: 'Escape', preventDefault: (): number => (prevented += 1), stopPropagation: (): void => undefined } as unknown as Event);
  assert.equal(element(), undefined);
  assert.equal(prevented, 1);
  assert.deepEqual(log, ['run', 'cancel', 'toast neutral GitHub connection cancelled']);
});

test('says who is connected and closes after two seconds', () => {
  const { element, show, timers, log } = setup();
  show({ step: 'connected', login: 'tore' });
  assert.deepEqual(texts(element()), [TITLE, 'Connected as tore']);
  assert.deepEqual(timers.delays, [2000]);
  timers.pending[0]?.run();
  assert.equal(element(), undefined);
  assert.deepEqual(log, ['run', 'cancel']);
});

test('says why it failed and starts again on Try again', () => {
  const { element, show, log } = setup();
  show({ step: 'failed', message: 'The code expired.' });
  assert.deepEqual(texts(element()), [TITLE, 'The code expired.', RETRY_LABEL, CANCEL_LABEL]);
  buttons(element())[0]?.click();
  assert.deepEqual(log, ['run', 'run']);
});

test('shows one panel at a time and cancels nothing when it was never open', () => {
  const { dom, panel, log } = setup();
  panel.open(1, 2);
  assert.equal(dom.created.filter((node) => node.hasAttribute(PANEL_ATTRIBUTE) && node.parentElement !== null).length, 1);
  panel.close();
  panel.close();
  assert.deepEqual(log, ['run', 'cancel', 'run', 'cancel']);
});
