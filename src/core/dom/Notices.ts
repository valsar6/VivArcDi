import type { Toast, ToastKind } from './Toast.js';

export const NOTICE_MS = 8000;

export type NoticeBoard = Pick<Notices, 'show' | 'once'>;

export class Notices {
  #toast: Pick<Toast, 'show' | 'remove'>;
  #seen = new Set<string>();

  /**
   * The one place where the window tells the user something. Every notice goes through one toast,
   * so two notices never stack.
   *
   * @param toast The window's shared toast.
   */
  constructor(toast: Pick<Toast, 'show' | 'remove'>) {
    this.#toast = toast;
  }

  /**
   * Shows a message now, every time it is called.
   *
   * @param text The message.
   * @param kind The icon of the message: `ok` by default.
   */
  public show(text: string, kind: ToastKind = 'ok'): void {
    this.#toast.show(text, kind);
  }

  /**
   * Shows a message the first time the key is seen in this window, and nothing afterwards.
   *
   * @param key What identifies the message for the session.
   * @param text The message.
   * @param kind The icon of the message: `ok` by default.
   */
  public once(key: string, text: string, kind: ToastKind = 'ok'): void {
    if (this.#seen.has(key)) {
      return;
    }
    this.#seen.add(key);
    this.show(text, kind);
  }

  /** Takes the shared toast out of the window. */
  public remove(): void {
    this.#toast.remove();
  }
}
