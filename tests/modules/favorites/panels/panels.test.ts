import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PanelBar } from '../../../../src/modules/favorites/panels/PanelBar.js';
import type { PanelSelectors } from '../../../../src/modules/favorites/panels/PanelBar.js';
import { WebPanelForm } from '../../../../src/modules/favorites/panels/WebPanelForm.js';
import { WebPanelList } from '../../../../src/modules/favorites/panels/WebPanelList.js';

const SELECTORS: PanelSelectors = { addButton: 'add', addressField: 'address', addSubmit: 'submit', panelButton: 'panel' };

class Element {
  public clicks = 0;
  public value = '';
  public events: string[] = [];
  constructor(public name: string | null = null, private onClick: () => void = (): void => undefined) {}
  public getAttribute(): string | null {
    return this.name;
  }
  public getBoundingClientRect(): { x: number; y: number; width: number; height: number } {
    return { x: 10, y: 20, width: 4, height: 6 };
  }
  public dispatchEvent(event: Event): boolean {
    this.events.push(event.type);
    if (event.type === 'click') {
      this.clicks += 1;
      this.onClick();
    }
    return true;
  }
}

class Page {
  public defaultView = null;
  public elements = new Map<string, Element[]>();
  public querySelector = (selector: string): Element | null => this.elements.get(selector)?.[0] ?? null;
  public querySelectorAll = (selector: string): Element[] => this.elements.get(selector) ?? [];
}

test('fills the address field and fires an input event', () => {
  const page = new Page();
  const field = new Element();
  page.elements.set('address', [field]);
  const bar = new PanelBar(page as never, SELECTORS);
  assert.equal(bar.fill('https://example.com/'), true);
  assert.equal(field.value, 'https://example.com/');
  assert.deepEqual(field.events, ['input']);
  assert.equal(new PanelBar(new Page() as never, SELECTORS).fill('x'), false);
});

test('lists the panels of the bar and clicks the one asked for', () => {
  const page = new Page();
  const second = new Element('WEBPANEL_b');
  page.elements.set('panel', [new Element('WEBPANEL_a'), second]);
  const bar = new PanelBar(page as never, SELECTORS);
  assert.deepEqual(bar.panelIds(), ['WEBPANEL_a', 'WEBPANEL_b']);
  assert.equal(bar.show('WEBPANEL_b'), true);
  assert.equal(second.clicks, 1);
  assert.equal(bar.show('WEBPANEL_x'), false);
});

test('adds a panel through the form in order and waits for its button', async () => {
  const log: string[] = [];
  let ids = ['WEBPANEL_a'];
  const bar = {
    panelIds: (): string[] => ids,
    openForm: (): boolean => !!log.push('open'),
    fill: (address: string): boolean => !!log.push(`fill ${address}`),
    submit: (): boolean => {
      log.push('submit');
      ids = [...ids, 'WEBPANEL_b'];
      return true;
    },
  };
  await new WebPanelForm({ bar, sleep: async (): Promise<void> => undefined }).add('https://example.com/');
  assert.deepEqual(log, ['open', 'fill https://example.com/', 'submit']);
});

test('fails when the form or the new panel never appears', async () => {
  const sleep = async (): Promise<void> => undefined;
  const base = { panelIds: (): string[] => [], openForm: (): boolean => true, fill: (): boolean => true, submit: (): boolean => true };
  await assert.rejects(new WebPanelForm({ bar: { ...base, openForm: (): boolean => false }, sleep }).add('x'), /opens the Add web panel form/);
  await assert.rejects(new WebPanelForm({ bar: { ...base, fill: (): boolean => false }, sleep, timeoutMs: 100 }).add('x'), /address field/);
  await assert.rejects(new WebPanelForm({ bar: base, sleep, timeoutMs: 100 }).add('x'), /did not add/);
});

test('compares addresses without the fragment and a trailing slash', () => {
  assert.equal(WebPanelList.sameAddress('https://wikipedia.org', 'https://wikipedia.org/'), true);
  assert.equal(WebPanelList.sameAddress('https://a.example/x/#top', 'https://a.example/x'), true);
  assert.equal(WebPanelList.sameAddress('https://a.example/x?q=1', 'https://a.example/x'), false);
  assert.equal(WebPanelList.sameAddress('https://a.example/', 'http://a.example/'), false);
  assert.equal(WebPanelList.sameAddress('not a url/', 'not a url'), true);
});

test('finds only a panel that has a button, and ignores unreadable elements', async () => {
  const elements = [null, { id: 3 }, { id: 'WEBPANEL_hidden', url: 'https://h.example/' }, { id: 'WEBPANEL_a', url: 'https://a.example/' }];
  const list = new WebPanelList({ prefs: { get: async (): Promise<unknown> => elements }, bar: { panelIds: (): string[] => ['WEBPANEL_a'], show: (): boolean => true, available: true } });
  assert.equal(await list.find('https://a.example'), 'WEBPANEL_a');
  assert.equal(await list.find('https://h.example/'), null);
  const broken = new WebPanelList({ prefs: { get: async (): Promise<unknown> => undefined }, bar: { panelIds: (): string[] => [], show: (): boolean => false, available: true } });
  assert.equal(await broken.find('https://a.example/'), null);
});

test('presses panel bar buttons like a real click', () => {
  const page = new Page();
  const add = new Element();
  const panel = new Element('WEBPANEL_a');
  const submit = new Element();
  page.elements.set('add', [add]);
  page.elements.set('panel', [panel]);
  page.elements.set('submit', [submit]);
  const bar = new PanelBar(page as never, SELECTORS);
  bar.openForm();
  bar.show('WEBPANEL_a');
  bar.submit();
  const sequence = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
  assert.deepEqual(add.events, sequence);
  assert.deepEqual(panel.events, sequence);
  assert.deepEqual(submit.events, sequence);
});
