import type { BrowserTabs } from '../../../core/BrowserTabs.js';
import type { Logger } from '../../../core/Logger.js';
import { MenuItemShape } from './MenuItemShape.js';
import { TabSlot } from '../../../core/TabSlot.js';

/** A command added to Vivaldi's menu of a tab. */
export interface TabMenuCommand {
  /** The id Vivaldi reports when the item is chosen; it must not clash with Vivaldi's ids. */
  id: string;
  label: string;
  /** Called with the tab the menu was opened on. */
  run: (tab: chrome.tabs.Tab) => void | Promise<void>;
}

type Show = (...args: unknown[]) => unknown;

type Listener = (...values: unknown[]) => void;

/** The part of `vivaldi.contextMenu` that is used; every member is checked before use. */
export interface ContextMenuApi {
  show?: unknown;
  onActivated?: { addListener?: unknown; removeListener?: unknown } | undefined;
}

export interface TabMenuItemsDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** `vivaldi.contextMenu`, or undefined where it does not exist. */
  contextMenu: ContextMenuApi | undefined;
  /** Selector of Vivaldi's tab wrapper, which carries `data-id="tab-<id>"`. */
  wrapperSelector: string;
  tabs: Pick<BrowserTabs, 'get'>;
  commands: readonly TabMenuCommand[];
  /** Whether the commands are offered on a tab. */
  appliesTo: (tab: chrome.tabs.Tab) => boolean;
  logger: Logger;
  /** The clock, replaceable in tests. */
  now?: () => number;
}

interface Pressed {
  tabId: number;
  at: number;
}

const MAX_AGE_MS = 1000;

export class TabMenuItems {
  #deps: TabMenuItemsDependencies;
  #original: Show | null = null;
  #wrapper: Show | null = null;
  #pressed: Pressed | null = null;
  #pending: number | null = null;
  #warned = false;
  #onContext = (event: Event): void => this.#context(event);
  #onActivated: Listener = (...values) => void this.#activated(values);

  /**
   * Adds commands to Vivaldi's menu of a tab. Vivaldi builds that menu itself and shows it with
   * `vivaldi.contextMenu.show`, so the call is wrapped: a right click on a tab slot is remembered,
   * and the `show` that follows gets a separator and the commands after its own items, in the
   * shape of its own items, without delaying the call. When the activation reports one of the ids,
   * the tab is read and the command runs if it applies to it; any other id goes to Vivaldi as
   * before. Every other call of `show` passes through unchanged. Where the API or the shape of its
   * items is not as expected, nothing is added and the reason is logged once.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: TabMenuItemsDependencies) {
    this.#deps = dependencies;
  }

  /**
   * Wraps `show` and starts remembering the tab under a right click.
   */
  public start(): void {
    const { contextMenu, document, logger } = this.#deps;
    if (typeof contextMenu?.show !== 'function') {
      logger.warn('vivaldi.contextMenu.show is missing: Pin tab and Tile tab stay on Cmd/Ctrl+D and the drags');
      return;
    }
    const original = contextMenu.show as Show;
    const wrapper: Show = (...args) => this.#show(original, contextMenu, args);
    this.#original = original;
    this.#wrapper = wrapper;
    contextMenu.show = wrapper;
    document.addEventListener('contextmenu', this.#onContext, true);
    this.#listen('addListener');
  }

  /**
   * Restores `show` and stops listening.
   */
  public stop(): void {
    const { contextMenu, document } = this.#deps;
    if (this.#original === null || contextMenu === undefined) {
      return;
    }
    if (contextMenu.show === this.#wrapper) {
      contextMenu.show = this.#original;
    }
    document.removeEventListener('contextmenu', this.#onContext, true);
    this.#listen('removeListener');
    this.#original = null;
    this.#wrapper = null;
    this.#pressed = null;
    this.#pending = null;
  }

  #listen(method: 'addListener' | 'removeListener'): void {
    const event = this.#deps.contextMenu?.onActivated;
    const register = event?.[method];
    if (typeof register === 'function') {
      register.call(event, this.#onActivated);
    }
  }

  #context(event: Event): void {
    const target = event.target as Element | null;
    const tabId = target?.closest?.(this.#deps.wrapperSelector) == null ? null : TabSlot.idOf(target, this.#deps.wrapperSelector);
    this.#pressed = tabId === null ? null : { tabId, at: (this.#deps.now ?? Date.now)() };
  }

  #show(original: Show, host: ContextMenuApi, args: unknown[]): unknown {
    const pressed = this.#pressed;
    this.#pressed = null;
    if (pressed === null || (this.#deps.now ?? Date.now)() - pressed.at > MAX_AGE_MS) {
      return original.apply(host, args);
    }
    return original.apply(host, this.#extend(args, pressed.tabId));
  }

  #extend(args: unknown[], tabId: number): unknown[] {
    const [params, ...rest] = args;
    const found = (params as { items?: unknown } | null | undefined)?.items;
    const items: unknown[] = Array.isArray(found) ? found : [];
    const shape = Array.isArray(found) ? MenuItemShape.from(items) : null;
    if (shape === null) {
      this.#warnOnce('the items of vivaldi.contextMenu.show are not as expected: no command was added to the menu of the tab');
      return args;
    }
    const separator = shape.separator();
    const added = this.#deps.commands.map(({ id, label }) => shape.command(id, label));
    this.#pending = tabId;
    return [{ ...(params as object), items: [...items, ...(separator === null ? [] : [separator]), ...added] }, ...rest.map((arg) => this.#follow(arg))];
  }

  #follow(arg: unknown): unknown {
    if (typeof arg !== 'function') {
      return arg;
    }
    return (...values: unknown[]): unknown => (this.#activated(values) ? undefined : (arg as Show)(...values));
  }

  #activated(values: unknown[]): boolean {
    const ids = values.map((value) => MenuItemShape.idIn(value));
    const command = this.#deps.commands.find((candidate) => ids.includes(candidate.id));
    const tabId = this.#pending;
    if (command === undefined) {
      return false;
    }
    this.#pending = null;
    if (tabId !== null) {
      this.#run(command, tabId).catch((error: unknown) => this.#deps.logger.warn(`could not run "${command.label}" from the menu of a tab`, error));
    }
    return true;
  }

  async #run(command: TabMenuCommand, tabId: number): Promise<void> {
    const tab = await this.#deps.tabs.get(tabId);
    if (this.#deps.appliesTo(tab)) {
      await command.run(tab);
    } else {
      this.#deps.logger.warn(`"${command.label}" does not apply to this tab`);
    }
  }

  #warnOnce(message: string): void {
    if (!this.#warned) {
      this.#warned = true;
      this.#deps.logger.warn(message);
    }
  }
}
