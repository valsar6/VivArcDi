import type { CallSelectors, CallWarning } from '../../modules/callpip/CallMessage.js';
import type { PictureObserver } from './PipSource.js';
import type { TilePager } from './TilePager.js';

export type CallControlName = 'microphone' | 'camera' | 'leave';

export interface MediaSessionLike {
  setActionHandler(action: string, handler: (() => void) | null): void;
  setMicrophoneActive?(active: boolean): void;
  setCameraActive?(active: boolean): void;
}

/** Calls back each time the muted attribute of an element changes; returns what stops the watching. */
export type ObserveMuted = (element: Element, onChange: () => void) => () => void;

type ControlSelectors = Pick<CallSelectors, 'inCall' | 'microphone' | 'camera'>;

export interface CallControlsParts {
  /** The document of the call page. */
  root: ParentNode;
  /** The selectors of the three controls. */
  selectors: ControlSelectors;
  /** The Media Session of the page, or null where there is none. */
  session: MediaSessionLike | null;
  /** Watches the muted attribute of a control. */
  observe: ObserveMuted;
  /** Tells the interface that a control was not found. */
  warn: (reason: CallWarning) => void;
}

const SELECTOR_OF: Record<CallControlName, keyof ControlSelectors> = { microphone: 'microphone', camera: 'camera', leave: 'inCall' };
const MUTED_ATTRIBUTE = 'data-is-muted';

export class CallControls implements PictureObserver {
  #root: ParentNode;
  #selectors: ControlSelectors;
  #session: MediaSessionLike | null;
  #observe: ObserveMuted;
  #warn: (reason: CallWarning) => void;
  #pager: TilePager | null = null;
  #registered: string[] = [];
  #watching: Array<() => void> = [];

  /**
   * The buttons of the floating window: microphone, camera and leave the call act on the matching
   * controls of the call page, the microphone and camera buttons show the page's state, and the previous
   * and next buttons move the pages of the picture.
   *
   * @param parts The page, the selectors of the three controls, the Media Session, the muted-attribute
   * watcher and what tells the interface that a control was not found.
   */
  constructor(parts: CallControlsParts) {
    this.#root = parts.root;
    this.#selectors = parts.selectors;
    this.#session = parts.session;
    this.#observe = parts.observe;
    this.#warn = parts.warn;
  }

  public opened(pager: TilePager): void {
    this.closed();
    this.#pager = pager;
    this.#register('togglemicrophone', () => this.#click('microphone'));
    this.#register('togglecamera', () => this.#click('camera'));
    this.#register('hangup', () => this.#click('leave'));
    this.#register('previoustrack', () => pager.previous());
    this.#register('nexttrack', () => pager.next());
    this.#follow('microphone', (active) => this.#session?.setMicrophoneActive?.(active));
    this.#follow('camera', (active) => this.#session?.setCameraActive?.(active));
  }

  public closed(): void {
    this.#registered.forEach((action) => this.#unregister(action));
    this.#registered = [];
    this.#watching.forEach((stop) => stop());
    this.#watching = [];
    this.#pager = null;
  }

  /**
   * Moves the pages of the picture with an arrow key.
   *
   * @param key `ArrowLeft` or `ArrowRight`.
   * @returns Whether the window is open and the key moved a page.
   */
  public page(key: string): boolean {
    if (this.#pager === null || (key !== 'ArrowLeft' && key !== 'ArrowRight')) {
      return false;
    }
    if (key === 'ArrowLeft') {
      this.#pager.previous();
    } else {
      this.#pager.next();
    }
    return true;
  }

  #click(name: CallControlName): void {
    const control = this.#root.querySelector<HTMLElement>(this.#selectors[SELECTOR_OF[name]]);
    if (control === null) {
      this.#warn('control-not-found');
      return;
    }
    control.click();
  }

  #follow(name: 'microphone' | 'camera', report: (active: boolean) => void): void {
    const control = this.#root.querySelector(this.#selectors[name]);
    if (control === null) {
      return;
    }
    const update = (): void => report(control.getAttribute(MUTED_ATTRIBUTE) !== 'true');
    update();
    this.#watching.push(this.#observe(control, update));
  }

  #register(action: string, handler: () => void): void {
    try {
      this.#session?.setActionHandler(action, handler);
      this.#registered.push(action);
    } catch {
      return;
    }
  }

  #unregister(action: string): void {
    try {
      this.#session?.setActionHandler(action, null);
    } catch {
      return;
    }
  }
}
