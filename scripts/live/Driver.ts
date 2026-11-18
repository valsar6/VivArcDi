import { setTimeout as sleep } from 'node:timers/promises';
import type { CdpConnection, CdpParams } from './cdp/CdpConnection.js';

export interface Point {
  x: number;
  y: number;
}

export type Modifier = 'Alt' | 'Control' | 'Meta' | 'Shift';

const MODIFIER_BITS: Record<Modifier, number> = { Alt: 1, Control: 2, Meta: 4, Shift: 8 };
const WAIT_MS = 10_000;
const POLL_MS = 100;
const DRAG_STEPS = 8;

export class Driver {
  #cdp: CdpConnection;
  #selectors: Readonly<Record<string, string>>;

  /**
   * The API scenarios use to act on window.html; it hides the protocol.
   *
   * @param cdp Connection to window.html.
   * @param selectors The selector catalog of the running Vivaldi version.
   */
  constructor(cdp: CdpConnection, selectors: Record<string, string>) {
    this.#cdp = cdp;
    this.#selectors = selectors;
  }

  /**
   * @param name Selector name from `src/selectors/<version>.json`.
   * @returns The CSS selector.
   * @throws {Error} When the catalog does not define it.
   */
  public selector(name: string): string {
    const selector = this.#selectors[name];
    if (selector === undefined) {
      throw new Error(`Selector "${name}" is not in the catalog`);
    }
    return selector;
  }

  /**
   * Evaluates an expression in window.html and waits for it when it is a promise.
   *
   * @param expression JavaScript source.
   * @returns The value, copied as JSON.
   * @throws {Error} When the expression throws.
   */
  public async evaluate<T>(expression: string): Promise<T> {
    const reply = await this.#cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    const thrown = reply['exceptionDetails'] as { exception?: { description?: string }; text?: string } | undefined;
    if (thrown !== undefined) {
      throw new Error(thrown.exception?.description ?? thrown.text ?? 'The expression threw');
    }
    return (reply['result'] as { value?: T } | undefined)?.value as T;
  }

  /**
   * @param css CSS selector.
   * @returns Whether window.html has a matching element.
   */
  public async exists(css: string): Promise<boolean> {
    return this.evaluate<boolean>(`document.querySelector(${JSON.stringify(css)}) !== null`);
  }

  /**
   * Waits until an expression is truthy.
   *
   * @param expression JavaScript source evaluated repeatedly.
   * @param waitMs How long to wait.
   * @throws {Error} When the expression stays falsy.
   */
  public async waitFor(expression: string, waitMs = WAIT_MS): Promise<void> {
    const deadline = Date.now() + waitMs;
    while (!(await this.evaluate<boolean>(`Boolean(${expression})`))) {
      if (Date.now() > deadline) {
        throw new Error(`Timed out waiting for ${expression}`);
      }
      await sleep(POLL_MS);
    }
  }

  /**
   * @param css CSS selector of an element that must appear.
   */
  public async waitForElement(css: string): Promise<void> {
    await this.waitFor(`document.querySelector(${JSON.stringify(css)})`);
  }

  /**
   * @param css CSS selector.
   * @param text Text the element must contain; any element matches when omitted.
   * @returns The centre of the first matching element, in window.html coordinates.
   * @throws {Error} When nothing matches.
   */
  public async centre(css: string, text = ''): Promise<Point> {
    const point = await this.evaluate<Point | null>(
      `(() => { const box = [...document.querySelectorAll(${JSON.stringify(css)})]
        .find((element) => element.textContent.includes(${JSON.stringify(text)}))?.getBoundingClientRect();
        return box ? { x: box.x + box.width / 2, y: box.y + box.height / 2 } : null; })()`,
    );
    if (point === null) {
      throw new Error(`Nothing matches ${css} ${text}`.trim());
    }
    return point;
  }

  /**
   * Clicks the centre of an element with the left mouse button, as a person would.
   *
   * @param css CSS selector.
   * @param text Text the element must contain, to pick one of several matches.
   */
  public async click(css: string, text = ''): Promise<void> {
    const point = await this.centre(css, text);
    await this.#mouse('mouseMoved', point);
    await this.#mouse('mousePressed', point);
    await this.#mouse('mouseReleased', point);
  }

  /**
   * Drags from the centre of one element to the centre of another in small steps.
   *
   * @param from CSS selector of the dragged element.
   * @param to CSS selector of the drop target.
   */
  public async drag(from: string, to: string): Promise<void> {
    const start = await this.centre(from);
    const end = await this.centre(to);
    await this.#mouse('mousePressed', start);
    for (let step = 1; step <= DRAG_STEPS; step++) {
      const ratio = step / DRAG_STEPS;
      await this.#mouse('mouseMoved', { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio });
    }
    await this.#mouse('mouseReleased', end);
  }

  /**
   * Presses and releases one key.
   *
   * @param key Key name, e.g. `Enter` or `t`.
   * @param modifiers Keys held down meanwhile.
   */
  public async press(key: string, modifiers: Modifier[] = []): Promise<void> {
    const bits = modifiers.reduce((sum, modifier) => sum | MODIFIER_BITS[modifier], 0);
    const code = key.length === 1 ? `Key${key.toUpperCase()}` : key;
    await this.#cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers: bits });
    await this.#cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers: bits });
  }

  /**
   * @param key Key in `chrome.storage.local`.
   * @returns Its value, or undefined.
   */
  public async storage<T>(key: string): Promise<T | undefined> {
    const name = JSON.stringify(key);
    return this.evaluate<T | undefined>(`chrome.storage.local.get(${name}).then((items) => items[${name}])`);
  }

  /**
   * Returns to the first workspace with a single tab: activates the oldest tab and closes the others.
   */
  public async reset(): Promise<void> {
    await this.evaluate(`(async () => {
      const tabs = (await chrome.tabs.query({ currentWindow: true })).sort((a, b) => a.id - b.id);
      const [first, ...others] = tabs;
      await chrome.tabs.update(first.id, { active: true });
      await chrome.tabs.remove(others.map((tab) => tab.id));
    })()`);
  }

  /**
   * @returns A PNG of window.html as it looks now.
   */
  public async screenshot(): Promise<Buffer> {
    const { data } = await this.#cdp.send('Page.captureScreenshot', { format: 'png' });
    return Buffer.from(String(data), 'base64');
  }

  async #mouse(type: string, point: Point): Promise<CdpParams> {
    return this.#cdp.send('Input.dispatchMouseEvent', { type, ...point, button: 'left', clickCount: 1 });
  }
}
