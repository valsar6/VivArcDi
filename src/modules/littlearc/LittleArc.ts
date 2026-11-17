import { Module } from '../../core/boot/Module.js';
import type { ModuleContext, PrivateWindowPolicy } from '../../core/boot/Module.js';
import { LITTLE_ARC_OPTIONS } from './LittleArcOptions.js';
import type { LittleArcOptions } from './LittleArcOptions.js';
import { LittleArcRegistry } from './LittleArcRegistry.js';
import { MainWindowRole } from './MainWindowRole.js';
import { PopupWindowRole } from './PopupWindowRole.js';

export class LittleArc extends Module<LittleArcOptions> {
  public static override id = 'little-arc';
  public static override privateWindows: PrivateWindowPolicy = 'never';

  public static override options = LITTLE_ARC_OPTIONS;

  #role: MainWindowRole | PopupWindowRole | null = null;

  /**
   * Little Arc: a small, minimal window for a quick lookup. In a normal window the module opens it on
   * Cmd+Opt+N (Ctrl+Alt+N) and for links opened from other apps, and takes a kept page into the window.
   * In a Little Arc window it draws the compact bar. Without `chrome.tabs` or `chrome.windows` the
   * module stays off and Vivaldi handles links as usual.
   *
   * @param context What the module may use.
   */
  public override async start(context: ModuleContext<LittleArcOptions>): Promise<void> {
    if (!context.tabs.available || !context.windows.available) {
      context.logger.warn('chrome.tabs or chrome.windows is missing: Little Arc is off');
      return;
    }
    const current = await context.windows.current();
    if (current.id === undefined) {
      context.logger.warn('this window has no id: Little Arc is off');
      return;
    }
    const settings = context.options;
    const registry = new LittleArcRegistry(context.storage);
    const Role = current.type === 'popup' ? PopupWindowRole : MainWindowRole;
    this.#role = new Role(context, settings, registry, current.id);
    await this.#role.start();
  }

  /**
   * Removes every listener and the bar.
   */
  public override stop(): void {
    this.#role?.stop();
    this.#role = null;
  }
}
