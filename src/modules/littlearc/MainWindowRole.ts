import { ActiveWorkspace } from '../../core/ActiveWorkspace.js';
import { WorkspaceNames } from '../../core/WorkspaceNames.js';
import type { ModuleContext } from '../../core/Module.js';
import { ShortcutKeys } from '../../core/ShortcutKeys.js';
import { WindowKeys } from '../../core/WindowKeys.js';
import { DestinationPalette } from './DestinationPalette.js';
import { DestinationPicker } from './DestinationPicker.js';
import { ExternalLinkDetector } from './ExternalLinkDetector.js';
import { DETECTION_DELAY_MS, ExternalLinkWatcher } from './ExternalLinkWatcher.js';
import { FocusHistory } from './FocusHistory.js';
import { LittleArcLauncher } from './LittleArcLauncher.js';
import { isDestinationQuestion, parseAdoptMessage } from './LittleArcMessage.js';
import type { LittleArcRegistry } from './LittleArcRegistry.js';
import type { LittleArcSettings } from './LittleArcSettings.js';
import { screenOf } from './ScreenAreas.js';
import { WorkspaceAdopter } from './WorkspaceAdopter.js';
import type { DestinationSource } from './WorkspaceAdopter.js';

export class MainWindowRole {
  #context: ModuleContext;
  #settings: LittleArcSettings;
  #registry: LittleArcRegistry;
  #windowId: number;
  #launcher: LittleArcLauncher;
  #cleanups: Array<() => void> = [];

  /**
   * What Little Arc does in a normal window: opens the small window on Cmd+Opt+N, moves links that
   * come from other apps into it, and takes a page kept from it into this window.
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
    this.#launcher = new LittleArcLauncher({
      windows: context.windows,
      registry,
      screen: (): ReturnType<typeof screenOf> => screenOf(context.document),
      size: settings,
      logger: context.logger,
    });
  }

  /**
   * Starts listening for the shortcut, for moved pages and, when enabled, for links from other apps.
   */
  public async start(): Promise<void> {
    const keys = new WindowKeys(
      this.#context.document,
      (event): 'open' | null => (ShortcutKeys.isCommandOption(event, 'KeyN') ? 'open' : null),
      () => void this.#launcher.openBlank(),
    );
    keys.attach();
    this.#cleanups.push(() => keys.detach());
    await this.#listenForPages();
    if (this.#settings.externalLinks) {
      this.#listenForExternalLinks();
    }
    if (this.#settings.askWorkspace) {
      this.#context.logger.warn('askWorkspace is not available yet: the most recent workspace is used');
    }
  }

  /**
   * Removes every listener.
   */
  public stop(): void {
    this.#cleanups.forEach((cleanup) => cleanup());
    this.#cleanups = [];
  }

  async #listenForPages(): Promise<void> {
    const { tabs, windows, runtime, logger } = this.#context;
    if (!runtime.messagesAvailable) {
      logger.warn('chrome.runtime.onMessage is missing: pages cannot be moved from Little Arc');
      return;
    }
    const workspace = new ActiveWorkspace(tabs, (): void => undefined, logger);
    await workspace.start().catch((error: unknown) => logger.warn('cannot follow the workspace of this window', error));
    this.#cleanups.push(() => workspace.stop());
    const picker = new DestinationPicker(this.#settings.askWorkspace, () => Promise.resolve(null));
    const destination = await this.#destinationSource();
    const adopter = new WorkspaceAdopter({ tabs, windows, windowId: this.#windowId, recentWorkspace: (): string | null => workspace.current, picker, destination, logger });
    this.#cleanups.push(runtime.onMessage((message) => this.#handle(adopter, message)));
  }

  async #destinationSource(): Promise<DestinationSource> {
    const { prefs, document, selectors, logger } = this.#context;
    const names = new WorkspaceNames(prefs, (): void => undefined, logger);
    await names.start().catch((error: unknown) => logger.warn('cannot read the names of the workspaces', error));
    this.#cleanups.push(() => names.stop());
    const root = (): HTMLElement | null => document.querySelector<HTMLElement>(selectors.get('browser'));
    return { nameOf: (workspace) => names.nameOf(workspace), colors: () => DestinationPalette.read(root()) };
  }

  #handle(adopter: WorkspaceAdopter, message: unknown): void {
    const request = parseAdoptMessage(message);
    if (request !== null) {
      void adopter.adopt(request);
    } else if (isDestinationQuestion(message)) {
      void this.#answer(adopter);
    }
  }

  async #answer(adopter: WorkspaceAdopter): Promise<void> {
    const answer = await adopter.describeDestination();
    if (answer !== null) {
      await this.#context.runtime.sendMessage(answer).catch((error: unknown) => this.#context.logger.warn('could not answer the Little Arc bar', error));
    }
  }

  #listenForExternalLinks(): void {
    const { tabs, windows, logger } = this.#context;
    try {
      const history = new FocusHistory();
      const detector = new ExternalLinkDetector(history, (id) => this.#registry.has(id));
      const watcher = new ExternalLinkWatcher(tabs, detector, this.#launcher, logger);
      this.#cleanups.push(windows.onFocusChanged((id) => history.record(id)));
      this.#cleanups.push(tabs.onCreated((tab) => this.#watch(watcher, tab)));
    } catch (error) {
      logger.warn('cannot follow new tabs or window focus: links from other apps stay in the main window', error);
    }
  }

  #watch(watcher: ExternalLinkWatcher, tab: chrome.tabs.Tab): void {
    if (tab.id === undefined || tab.windowId !== this.#windowId) {
      return;
    }
    const { id } = tab;
    const createdAt = Date.now();
    const timer = setTimeout(() => void watcher.check(id, createdAt), DETECTION_DELAY_MS);
    this.#cleanups.push(() => clearTimeout(timer));
  }
}
