import type { ElementGestures } from '../../core/ElementGestures.js';
import type { SelectorCatalog } from '../../core/SelectorCatalog.js';
import type { EditorOpener } from './EditorOpener.js';
import type { Poll } from './Poll.js';

export interface MenuTools {
  gestures: Pick<ElementGestures, 'click' | 'write' | 'press'>;
  poll: Pick<Poll, 'until'>;
  editor: EditorOpener;
}

const APPEAR_MS = 1000;
const SAVE_BUTTON_MS = 300;

export class WorkspaceMenu {
  #document: Document;
  #selectors: Pick<SelectorCatalog, 'get'>;
  #gestures: Pick<ElementGestures, 'click' | 'write' | 'press'>;
  #poll: Pick<Poll, 'until'>;
  #editor: EditorOpener;

  /**
   * Vivaldi's own workspace menu, driven step by step. Every step throws an error when the part of
   * the interface it needs is not there, so the caller can stop and close the menu.
   *
   * @param document The document of Vivaldi's browser window.
   * @param selectors Selectors of the menu.
   * @param tools How to press, write and close, how to wait for the menu to draw itself, and how to open the inline editor of a workspace row.
   */
  constructor(document: Document, selectors: Pick<SelectorCatalog, 'get'>, tools: MenuTools) {
    this.#document = document;
    this.#selectors = selectors;
    this.#gestures = tools.gestures;
    this.#poll = tools.poll;
    this.#editor = tools.editor;
  }

  /**
   * Opens the menu from the workspace button.
   */
  public async open(): Promise<void> {
    this.#gestures.click(await this.#appear('workspaceMenuButton'));
    await this.#appear('workspacePopup');
  }

  /**
   * Presses the new workspace button of the open menu and waits for the editor.
   */
  public async startCreate(): Promise<void> {
    this.#gestures.click(await this.#appear('workspaceCreate'));
    await this.#appear('workspaceTitle');
  }

  /**
   * Opens the inline editor of an existing workspace row.
   *
   * @param name The name of the workspace.
   */
  public async startRename(name: string): Promise<void> {
    if (!(await this.#editor.openEditor(this.#row(name)))) {
      throw new Error(`the editor of ${name} did not open`);
    }
  }

  /**
   * @param text The name to write in the editor.
   */
  public async writeName(text: string): Promise<void> {
    this.#gestures.write((await this.#appear('workspaceTitle')) as HTMLInputElement, text);
  }

  /**
   * Presses the save button of the editor; without a button, submits its form.
   */
  public async save(): Promise<void> {
    const button = await this.#poll.until(() => this.#document.querySelector(this.#selectors.get('workspaceSave')), SAVE_BUTTON_MS);
    if (button !== null) {
      this.#gestures.click(button);
      return;
    }
    const form = this.#document.querySelector<HTMLFormElement>(this.#selectors.get('workspaceForm'));
    if (form === null) {
      throw new Error('there is nothing to save');
    }
    form.requestSubmit();
  }

  /**
   * Closes the menu with an Escape key press.
   */
  public close(): void {
    this.#gestures.press(this.#document.body, 'Escape');
  }

  #row(name: string): Element {
    const rows = [...this.#document.querySelectorAll(this.#selectors.get('workspaceRow'))].filter((row) => (row.getAttribute('title') ?? '').trim().startsWith(name));
    const row = rows.find((candidate) => candidate.getAttribute('title')?.trim() === name) ?? rows[0];
    if (row === undefined) {
      throw new Error(`no workspace row for ${name}`);
    }
    return row;
  }

  async #appear(selectorName: string): Promise<Element> {
    const selector = this.#selectors.get(selectorName);
    const found = await this.#poll.until(() => this.#document.querySelector(selector), APPEAR_MS);
    if (found === null) {
      throw new Error(`${selectorName} did not appear`);
    }
    return found;
  }
}
