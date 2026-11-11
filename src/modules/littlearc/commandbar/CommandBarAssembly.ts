import type { ModuleContext } from '../../../core/Module.js';
import type { LittleArcLauncher } from '../LittleArcLauncher.js';
import type { LittleArcRegistry } from '../LittleArcRegistry.js';
import { BookmarkSuggestions } from './BookmarkSuggestions.js';
import { CommandBarController } from './CommandBarController.js';
import { CommandBarMount } from './CommandBarMount.js';
import { CommandBarView } from './CommandBarView.js';
import { HistorySuggestions } from './HistorySuggestions.js';
import { PageFocus } from './PageFocus.js';
import { SuggestionList } from './SuggestionList.js';
import { TabSuggestions } from './TabSuggestions.js';

/**
 * Puts the command bar together for a normal window: the sources of suggestions, the controller, the
 * view and the keeper of the focus.
 *
 * @param context What the module may use.
 * @param launcher Opens the Little Arc windows.
 * @param registry Tells which windows are Little Arc windows.
 * @param windowId The id of this window.
 * @returns The mount that the shortcut toggles.
 */
export function assembleCommandBar(context: ModuleContext, launcher: Pick<LittleArcLauncher, 'openAddress'>, registry: Pick<LittleArcRegistry, 'has'>, windowId: number): CommandBarMount {
  const { document, selectors, tabs, bookmarks, history, logger } = context;
  const recentPages = new HistorySuggestions(history);
  const list = new SuggestionList({ typed: [new TabSuggestions(tabs, (id) => registry.has(id)), new BookmarkSuggestions(bookmarks), recentPages], recent: recentPages }, logger);
  const controller = new CommandBarController({ list, launcher, logger });
  const focus = new PageFocus({ document, tabs, windowId, webviewSelector: selectors.get('tabWebview') });
  const view = new CommandBarView({ document, controller, focus });
  return new CommandBarMount({ host: () => document.querySelector<HTMLElement>(selectors.get('browser')), controller, view, logger });
}
