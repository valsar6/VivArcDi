import { DomQuery } from '../../core/DomQuery.js';
import type { ModuleContext } from '../../core/Module.js';
import { WindowKeys } from '../../core/WindowKeys.js';
import { DestinationLookup } from './DestinationLookup.js';
import { IdleTimer } from './IdleTimer.js';
import { LittleArcBar } from './LittleArcBar.js';
import { commandFor } from './LittleArcKeyMap.js';
import type { LittleArcCommand } from './LittleArcKeyMap.js';
import { adoptMessage } from './LittleArcMessage.js';
import type { LittleArcRegistry } from './LittleArcRegistry.js';
import type { LittleArcSettings } from './LittleArcSettings.js';
import { PopupChrome } from './PopupChrome.js';

const REGISTRY_ATTEMPTS = 30;
const REGISTRY_INTERVAL_MS = 100;
const ADOPT_ANSWER_MS = 1000;
const ACTIVITY_EVENTS = ['keydown', 'pointerdown', 'pointermove', 'wheel'];

export class PopupWindowRole {
  #context: ModuleContext;
  #settings: LittleArcSettings;
  #registry: LittleArcRegistry;
  #windowId: number;
  #cleanups: Array<() => void> = [];

  /**
   * What Little Arc does inside its own window: draws the compact bar, handles Esc, Cmd/Ctrl+W
   * and Cmd/Ctrl+O, and closes the window when nobody touched it for a while.
   *
   * @param context What the module may use.
   * @param settings The module's settings.
   * @param registry Remembers which windows are Little Arc windows.
   * @param windowId The id of this window.
   */
  constructor(context: ModuleContext, settings: LittleArcSettings, registry: LittleArcRegistry, windowId: number) {
    this.#context = context;
    this.#settings = settings;
    this.#registry = registry;
    this.#windowId = windowId;
  }

  /**
   * Draws the bar, unless the window was not opened by Little Arc.
   */
  public async start(): Promise<void> {
    const { document, tabs, search, selectors, logger } = this.#context;
    if (!(await this.#waitForMark())) {
      return;
    }
    const [tab] = await tabs.query({ windowId: this.#windowId, active: true });
    if (tab?.id === undefined) {
      logger.warn('the Little Arc window has no tab: the bar is not drawn');
      return;
    }
    const tabId = tab.id;
    const host = DomQuery.require(document, selectors.get('browser'));
    const platform = document.defaultView?.navigator.platform ?? '';
    const address = tab.url ?? tab.pendingUrl ?? '';
    const bar = new LittleArcBar({ document, host, tabs, search, tabId, address, platform, onKeep: (): void => this.#keep(tabId), logger });
    bar.mount();
    this.#cleanups.push(() => bar.unmount());
    this.#frame(bar);
    this.#listenToKeys(bar, tabId);
    this.#watchIdle(tabId, (): void => this.#close());
    const { runtime } = this.#context;
    bar.setDestination(await new DestinationLookup(runtime, logger).ask());
  }

  /**
   * Removes the bar and every listener.
   */
  public stop(): void {
    this.#cleanups.forEach((cleanup) => cleanup());
    this.#cleanups = [];
  }

  #frame(bar: LittleArcBar): void {
    const { document, selectors, tabs, logger } = this.#context;
    const element = bar.element;
    if (element === null) {
      return;
    }
    const chrome = new PopupChrome(document, selectors, logger);
    chrome.mark(element);
    this.#cleanups.push(tabs.onUpdated(() => chrome.mark(element)), () => chrome.unmark());
  }

  #listenToKeys(bar: LittleArcBar, tabId: number): void {
    const commands: Record<LittleArcCommand, () => void> = { close: () => this.#close(), keep: () => this.#keep(tabId), clear: () => bar.revert() };
    const keys = new WindowKeys(this.#context.document, (event): LittleArcCommand | null => commandFor(event, bar.isEmpty), (command): void => commands[command]());
    keys.attach();
    this.#cleanups.push(() => keys.detach());
  }

  async #waitForMark(): Promise<boolean> {
    for (let attempt = 0; attempt < REGISTRY_ATTEMPTS; attempt += 1) {
      if (this.#registry.has(this.#windowId)) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, REGISTRY_INTERVAL_MS));
    }
    return false;
  }

  #close(): void {
    const { windows, logger } = this.#context;
    windows.remove(this.#windowId).catch((error: unknown) => logger.warn('could not close the Little Arc window', error));
  }

  #keep(tabId: number): void {
    const { runtime, windows, logger } = this.#context;
    const fallback = setTimeout(() => {
      logger.warn('no window took the page, opening it in a normal window');
      windows.create({ tabId, type: 'normal' }).catch((error: unknown) => logger.error('could not open the page in a normal window', error));
    }, ADOPT_ANSWER_MS);
    this.#cleanups.push(() => clearTimeout(fallback));
    runtime.sendMessage(adoptMessage(tabId, this.#windowId)).catch((error: unknown) => logger.warn('could not ask the main window to take the page', error));
  }

  #watchIdle(tabId: number, close: () => void): void {
    const { document, tabs } = this.#context;
    const timer = new IdleTimer(this.#settings.idleCloseHours, close);
    const touch = (): void => timer.touch();
    ACTIVITY_EVENTS.forEach((name) => document.addEventListener(name, touch, true));
    this.#cleanups.push(() => ACTIVITY_EVENTS.forEach((name) => document.removeEventListener(name, touch, true)));
    this.#cleanups.push(tabs.onUpdated((id) => (id === tabId ? touch() : undefined)));
    this.#cleanups.push(() => timer.stop());
    touch();
  }
}
