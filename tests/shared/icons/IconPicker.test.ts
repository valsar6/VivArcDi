import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORY_ATTRIBUTE,
  CELL_ATTRIBUTE,
  IconPicker,
  PICKER_ATTRIBUTE,
  REFRESH_ATTRIBUTE,
  RESET_ATTRIBUTE,
  SEARCH_ATTRIBUTE,
  TAB_ATTRIBUTE,
} from '../../../src/shared/icons/IconPicker.js';
import type { PickerCatalog, PickerTab, PickResult } from '../../../src/shared/icons/IconPicker.js';
import { asDocument, asElement, DomDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';

const POPOVER_RECT = { left: 0, right: 300, top: 0, bottom: 200 };

class PickerDocument extends DomDocument {
  public override createElement(tagName: string): DomNode {
    const node = super.createElement(tagName);
    node.rect = { ...POPOVER_RECT };
    return node;
  }

  public createElementNS(_namespace: string, tagName: string): DomNode {
    return this.createElement(tagName);
  }
}

const SYMBOLS = Array.from({ length: 24 }, (_, index) => ({ id: `symbol-${index}`, label: `Symbol ${index}`, path: `M${index} 0` }));
const CATEGORIES = [
  {
    id: 'faces',
    label: 'Faces',
    emoji: [
      { emoji: '😀', name: 'grinning face' },
      { emoji: '😍', name: 'heart eyes' },
    ],
  },
  { id: 'nature', label: 'Nature', emoji: [{ emoji: '🌳', name: 'tree' }] },
];

const catalog: PickerCatalog = {
  categories: () => CATEGORIES,
  search: (text) => CATEGORIES.flatMap((category) => category.emoji).filter((entry) => entry.name.includes(text.trim().toLowerCase())),
};

interface Setup {
  dom: PickerDocument;
  picker: IconPicker;
  anchor: DomNode;
  loads: { count: number };
}

function setUp(load: () => Promise<PickerCatalog> = async () => catalog): Setup {
  const dom = new PickerDocument();
  dom.defaultView = { innerWidth: 800, innerHeight: 600 };
  const loads = { count: 0 };
  const anchor = dom.createElement('div');
  anchor.rect = { left: 10, right: 110, top: 100, bottom: 130 };
  const picker = new IconPicker({
    document: asDocument(dom),
    parent: (): Element => dom.parent as unknown as Element,
    catalog: (): Promise<PickerCatalog> => {
      loads.count += 1;
      return load();
    },
    symbols: SYMBOLS,
  });
  return { dom, picker, anchor, loads };
}

const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

const open = (dom: PickerDocument): DomNode | undefined => dom.created.findLast((node) => node.hasAttribute(PICKER_ATTRIBUTE) && node.parentElement !== null);
const inside = (dom: PickerDocument, attribute: string): DomNode[] => (open(dom)?.descendants() ?? []).filter((node) => node.hasAttribute(attribute));
const cells = (dom: PickerDocument): string[] => inside(dom, CELL_ATTRIBUTE).map((node) => node.getAttribute(CELL_ATTRIBUTE) ?? '');
const tab = (dom: PickerDocument, name: PickerTab): DomNode | undefined => inside(dom, TAB_ATTRIBUTE).find((node) => node.getAttribute(TAB_ATTRIBUTE) === name);
const key = (dom: PickerDocument, name: string): void =>
  dom.emit('keydown', { key: name, preventDefault: (): void => undefined, stopPropagation: (): void => undefined });

async function started(options: { tabs?: readonly PickerTab[]; refresh?: boolean } = {}, load?: () => Promise<PickerCatalog>): Promise<Setup & { result: Promise<PickResult | null> }> {
  const setup = setUp(load);
  const result = setup.picker.pick({ anchor: asElement(setup.anchor), ...options });
  await settle();
  return { ...setup, result };
}

function type(dom: PickerDocument, text: string): void {
  const field = inside(dom, SEARCH_ATTRIBUTE)[0];
  assert.ok(field);
  field.value = text;
  field.listeners.get('input')?.forEach((listener) => listener({ type: 'input', target: field } as unknown as Event));
}

test('opens the icon picker with emoji and icons', async () => {
  const { dom, picker } = await started();
  assert.ok(open(dom));
  assert.ok(tab(dom, 'emoji'));
  assert.ok(tab(dom, 'icons'));
  const field = inside(dom, SEARCH_ATTRIBUTE)[0];
  assert.equal(field?.focused, true);
  assert.equal(field?.getAttribute('placeholder'), 'Search');
  tab(dom, 'icons')?.click();
  const symbols = cells(dom).filter((id) => id.startsWith('symbol-'));
  assert.deepEqual(symbols, SYMBOLS.map((symbol) => symbol.id));
  picker.close();
});

test('filters the emoji by the search text', async () => {
  const { dom, picker } = await started();
  assert.deepEqual(cells(dom).filter((id) => !id.startsWith('symbol-')), ['😀', '😍', '🌳']);
  type(dom, 'heart');
  assert.deepEqual(cells(dom).filter((id) => !id.startsWith('symbol-')), ['😍']);
  type(dom, '');
  assert.deepEqual(cells(dom).filter((id) => !id.startsWith('symbol-')), ['😀', '😍', '🌳']);
  picker.close();
});

test('resolves reset from the Reset button', async () => {
  const { dom, result } = await started();
  inside(dom, RESET_ATTRIBUTE)[0]?.click();
  assert.deepEqual(await result, { reset: true });
  assert.equal(open(dom), undefined);
});

test('resolves refresh from the Refresh favicon button', async () => {
  const { dom, result } = await started({ refresh: true });
  inside(dom, REFRESH_ATTRIBUTE)[0]?.click();
  assert.deepEqual(await result, { refresh: true });
  assert.equal(open(dom), undefined);
});

test('shows no Refresh favicon button without the refresh option', async () => {
  const { dom, picker } = await started();
  assert.equal(inside(dom, REFRESH_ATTRIBUTE).length, 0);
  picker.close();
});

test('resolves null on Escape and leaves no listener', async () => {
  const { dom, result } = await started();
  key(dom, 'Enter');
  assert.ok(open(dom));
  key(dom, 'Escape');
  assert.equal(await result, null);
  assert.equal(open(dom), undefined);
  assert.equal([...dom.listeners.values()].flat().length, 0);
});

test('resolves null on a click outside and keeps the picker for a click inside', async () => {
  const { dom, result } = await started();
  dom.emit('mousedown', { button: 0, target: inside(dom, CELL_ATTRIBUTE)[0] });
  assert.ok(open(dom));
  dom.emit('mousedown', { button: 0, target: dom.createElement('div') });
  assert.equal(await result, null);
  assert.equal(open(dom), undefined);
});

test('resolves the symbol of a clicked symbol', async () => {
  const { dom, result } = await started();
  tab(dom, 'icons')?.click();
  inside(dom, CELL_ATTRIBUTE).find((node) => node.getAttribute(CELL_ATTRIBUTE) === 'symbol-3')?.click();
  assert.deepEqual(await result, { icon: { symbol: 'symbol-3' } });
});

test('resolves the emoji of a clicked emoji', async () => {
  const { dom, result } = await started();
  inside(dom, CELL_ATTRIBUTE).find((node) => node.getAttribute(CELL_ATTRIBUTE) === '🌳')?.click();
  assert.deepEqual(await result, { icon: { emoji: '🌳' } });
});

test('shows only the icons when the tabs ask for icons', async () => {
  const { dom, loads, picker } = await started({ tabs: ['icons'] });
  assert.equal(tab(dom, 'emoji'), undefined);
  assert.equal(inside(dom, SEARCH_ATTRIBUTE).length, 0);
  assert.equal(cells(dom).length, SYMBOLS.length);
  assert.equal(loads.count, 0);
  picker.close();
});

test('leaves the Icons tab when the catalog fails or is empty', async () => {
  for (const load of [(): Promise<PickerCatalog> => Promise.reject(new Error('no file')), async (): Promise<PickerCatalog> => ({ categories: () => [], search: () => [] })]) {
    const { dom, picker } = await started({}, load);
    assert.equal(inside(dom, SEARCH_ATTRIBUTE).length, 0);
    assert.ok(open(dom)?.descendants().some((node) => node.textContent === 'Emoji are not available'));
    tab(dom, 'icons')?.click();
    assert.equal(cells(dom).length, SYMBOLS.length);
    picker.close();
  }
});

test('closes the first picker when a second one opens', async () => {
  const { dom, picker, anchor } = await started();
  const first = open(dom);
  const second = picker.pick({ anchor: asElement(anchor) });
  await settle();
  assert.notEqual(open(dom), first);
  assert.equal(dom.parent.descendants().filter((node) => node.hasAttribute(PICKER_ATTRIBUTE)).length, 1);
  picker.close();
  assert.equal(await second, null);
});

test('the first picker resolves null when a second one opens', async () => {
  const { picker, anchor, result } = await started();
  const second = picker.pick({ anchor: asElement(anchor) });
  assert.equal(await result, null);
  picker.close();
  await second;
});

test('draws the emoji once and reuses them on a later open', async () => {
  const { dom, picker, anchor, loads } = await started();
  const before = inside(dom, CELL_ATTRIBUTE)[0];
  picker.close();
  void picker.pick({ anchor: asElement(anchor) });
  await settle();
  assert.equal(inside(dom, CELL_ATTRIBUTE)[0], before);
  assert.equal(loads.count, 1);
  picker.close();
});

test('scrolls the grid to the category of a category button', async () => {
  const { dom, picker } = await started();
  const buttons = inside(dom, CATEGORY_ATTRIBUTE);
  assert.deepEqual(buttons.map((node) => node.getAttribute('aria-label')), ['Faces', 'Nature']);
  buttons[1]?.click();
  picker.close();
});

test('is outside the window drag region and sits beside the anchor', async () => {
  const { dom, picker } = await started();
  assert.equal(open(dom)?.properties.get('-webkit-app-region'), 'no-drag');
  assert.equal(open(dom)?.properties.get('left'), '110px');
  assert.equal(open(dom)?.properties.get('top'), '100px');
  picker.close();
});

test('moves to the left of the anchor when there is no room on the right', async () => {
  const setup = setUp();
  setup.anchor.rect = { left: 700, right: 790, top: 100, bottom: 130 };
  void setup.picker.pick({ anchor: asElement(setup.anchor) });
  await settle();
  assert.equal(open(setup.dom)?.properties.get('left'), '400px');
  setup.picker.close();
});
