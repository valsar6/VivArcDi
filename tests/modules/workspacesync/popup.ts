import type { FakeNames } from './fakes.js';
import { SelectorCatalog } from '../../../src/core/SelectorCatalog.js';
import { readFileSync } from 'node:fs';

export const catalog = new SelectorCatalog(JSON.parse(readFileSync('src/selectors/8.1.json', 'utf8')) as Record<string, string>, '8.1');

class FakeEvent {
  public type: string;
  public init: Record<string, unknown>;

  constructor(type: string, init: Record<string, unknown> = {}) {
    this.type = type;
    this.init = init;
  }
}

class FakePointerEvent extends FakeEvent {}
class FakeMouseEvent extends FakeEvent {}
class FakeKeyboardEvent extends FakeEvent {}

class FakeInput {
  public typed = '';
}

Object.defineProperty(FakeInput.prototype, 'value', {
  get(this: FakeInput): string {
    return this.typed;
  },
  set(this: FakeInput, text: string) {
    this.typed = text;
  },
});

export const fakeView = { Event: FakeEvent, PointerEvent: FakePointerEvent, MouseEvent: FakeMouseEvent, KeyboardEvent: FakeKeyboardEvent, HTMLInputElement: FakeInput };

export class PopupElement {
  public events: FakeEvent[] = [];
  public typed = '';
  public focused = false;
  public submitted = 0;
  public attributes: Record<string, string>;
  #handle: (event: FakeEvent, element: PopupElement) => void;

  constructor(handle: (event: FakeEvent, element: PopupElement) => void, attributes: Record<string, string> = {}) {
    this.#handle = handle;
    this.attributes = attributes;
  }

  public get types(): string[] {
    return this.events.map(({ type }) => type);
  }

  public requestSubmit(): void {
    this.submitted += 1;
    this.#handle(new FakeEvent('click'), this);
  }

  public getBoundingClientRect(): { left: number; top: number; width: number; height: number } {
    return { left: 10, top: 20, width: 100, height: 40 };
  }

  public getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }

  public focus(): void {
    this.focused = true;
  }

  public dispatchEvent(event: FakeEvent): boolean {
    this.events.push(event);
    this.#handle(event, this);
    return true;
  }
}

export class FakeVivaldiMenu {
  public names: FakeNames;
  public shown = new Map<string, PopupElement[]>();
  public body = new PopupElement((event) => event.type === 'keydown' && event.init.key === 'Escape' && this.#hide());
  public button = new PopupElement((event) => event.type === 'click' && this.#openPopup());
  public acceptsSave = true;
  public formOnly = false;
  public focus = true;
  public active: { tagName: string; isContentEditable: boolean } | null = null;
  public history: Record<string, PopupElement> = {};
  #editing: string | null = null;
  #next = 700;

  constructor(names: FakeNames) {
    this.names = names;
  }

  public get document(): Document {
    const active = (): { tagName: string; isContentEditable: boolean } | null => this.active;
    return {
      body: this.body,
      defaultView: fakeView,
      get activeElement() {
        return active();
      },
      hasFocus: () => this.focus,
      querySelector: (selector: string) => this.#all(selector)[0] ?? null,
      querySelectorAll: (selector: string) => this.#all(selector),
    } as unknown as Document;
  }

  public get title(): PopupElement | null {
    return this.shown.get(catalog.get('workspaceTitle'))?.[0] ?? null;
  }

  public get create(): PopupElement | null {
    return this.shown.get(catalog.get('workspaceCreate'))?.[0] ?? null;
  }

  public get save(): PopupElement | null {
    return this.shown.get(catalog.get('workspaceSave'))?.[0] ?? null;
  }

  public get closed(): boolean {
    return !this.shown.has(catalog.get('workspacePopup'));
  }

  #all(selector: string): PopupElement[] {
    return selector === catalog.get('workspaceMenuButton') ? [this.button] : (this.shown.get(selector) ?? []);
  }

  public hideEditor(): void {
    this.shown.delete(catalog.get('workspaceTitle'));
    this.shown.delete(catalog.get('workspaceSave'));
    this.#editing = null;
  }

  #hide(): void {
    this.shown.clear();
    this.#editing = null;
  }

  #put(name: string, element: PopupElement): void {
    this.history[name] = element;
    this.shown.set(catalog.get(name), [...(this.shown.get(catalog.get(name)) ?? []), element]);
  }

  #openPopup(): void {
    this.#hide();
    this.#put('workspacePopup', new PopupElement(() => undefined));
    this.#put('workspaceCreate', new PopupElement((event) => event.type === 'click' && this.openEditor(null)));
    for (const name of this.names.names) {
      this.#put('workspaceRow', new PopupElement(() => undefined, { title: `${name}\n3 tabs`, name }));
    }
  }

  public openEditor(editing: string | null): void {
    this.#editing = editing;
    this.#put('workspaceTitle', new PopupElement(() => undefined));
    const save = new PopupElement((event) => event.type === 'click' && this.#commit());
    this.#put(this.formOnly ? 'workspaceForm' : 'workspaceSave', save);
  }

  #commit(): void {
    const typed = this.title?.typed ?? '';
    if (!this.acceptsSave || typed === '') {
      return;
    }
    const editing = this.#editing;
    this.names.workspaces =
      editing === null
        ? { ...this.names.workspaces, [String(this.#next++)]: typed }
        : Object.fromEntries(Object.entries(this.names.workspaces).map(([id, name]) => [id, name === editing ? typed : name]));
    this.#hide();
  }
}

export class FakeReactInternals {
  public calls: Array<[number, number | undefined]> = [];
  public hooks = true;
  public renamingIndex: number | null;
  #menu: FakeVivaldiMenu;

  constructor(menu: FakeVivaldiMenu, renamingIndex: number | null) {
    this.#menu = menu;
    this.renamingIndex = renamingIndex;
  }

  public renameHooks(row: PopupElement): { workspaceId: number; starters: Array<(id: number | undefined) => void> } | null {
    if (!this.hooks) {
      return null;
    }
    const starters = [0, 1, 2, 3].map((index) => (id: number | undefined): void => {
      this.calls.push([index, id]);
      if (index === this.renamingIndex) {
        if (id === undefined) {
          this.#menu.hideEditor();
        } else {
          this.#menu.openEditor(row.attributes.name ?? null);
        }
      }
    });
    return { workspaceId: 7, starters };
  }
}
