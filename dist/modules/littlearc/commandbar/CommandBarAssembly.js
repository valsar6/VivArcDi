import { BookmarkSuggestions } from "./BookmarkSuggestions.js";
import { CommandBarController } from "./CommandBarController.js";
import { CommandBarMount } from "./CommandBarMount.js";
import { CommandBarView } from "./CommandBarView.js";
import { HistorySuggestions } from "./HistorySuggestions.js";
import { PageFocus } from "./PageFocus.js";
import { SuggestionList } from "./SuggestionList.js";
import { TabSuggestions } from "./TabSuggestions.js";
function assembleCommandBar(context, launcher, registry, windowId) {
  const { document, selectors, tabs, bookmarks, history, logger } = context;
  const recentPages = new HistorySuggestions(history);
  const list = new SuggestionList({ typed: [new TabSuggestions(tabs, (id) => registry.has(id)), new BookmarkSuggestions(bookmarks), recentPages], recent: recentPages }, logger);
  const controller = new CommandBarController({ list, launcher, logger });
  const focus = new PageFocus({ document, tabs, windowId, webviewSelector: selectors.get("tabWebview") });
  const view = new CommandBarView({ document, controller, focus });
  return new CommandBarMount({ host: () => document.querySelector(selectors.get("browser")), controller, view, logger });
}
export {
  assembleCommandBar
};
