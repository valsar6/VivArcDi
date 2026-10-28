import type { PrefChangeListener, PrefsApi } from '../../src/core/BrowserPrefs.js';

export const CASETTA = { id: 1781382688540, name: 'Casetta', icon: 'workspace_icon_1' };
export const WORK = { id: 1781382688541, name: 'Work', icon: 'workspace_icon_2' };

export class FakePrefsApi implements PrefsApi {
  public values = new Map<string, unknown>();
  public reads = 0;
  public listeners = new Set<PrefChangeListener>();
  public onChanged: PrefsApi['onChanged'];

  constructor(announcesChanges = true) {
    this.onChanged = announcesChanges
      ? {
          addListener: (listener): void => void this.listeners.add(listener),
          removeListener: (listener): void => void this.listeners.delete(listener),
        }
      : undefined;
  }

  public get(key: string, callback: (result: { value?: unknown } | undefined) => void): void {
    this.reads += 1;
    callback({ ...(this.values.has(key) ? { value: this.values.get(key) } : {}), defaultValue: [], store: 1 } as { value?: unknown });
  }

  public set(key: string, value: unknown): void {
    this.values.set(key, value);
    this.listeners.forEach((listener) => listener(key, value));
  }
}
