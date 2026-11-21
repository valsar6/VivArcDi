import type { ModuleContext } from '../../../core/boot/Module.js';
import { TabDataWriter } from '../../../core/tabs/TabDataWriter.js';
import { Toast } from '../../../core/dom/Toast.js';
import { ElementGestures } from '../../../shared/spaces/ElementGestures.js';
import { ReactEditorOpener } from '../../../shared/spaces/EditorOpener.js';
import type { MenuParts } from '../../../shared/spaces/MenuCommand.js';
import { Poll } from '../../../shared/spaces/Poll.js';
import { QuietMoment } from '../../../shared/spaces/QuietMoment.js';
import { ReactInternals } from '../../../shared/spaces/ReactInternals.js';
import { WorkspaceCreator } from '../../../shared/spaces/WorkspaceCreator.js';
import { WorkspaceMenu } from '../../../shared/spaces/WorkspaceMenu.js';
import type { EditingSources } from './FolderEditing.js';
import { LinkRelocation } from './LinkRelocation.js';
import { LinkedTab } from './LinkedTab.js';
import { PromptDialog } from './PromptDialog.js';
import { WorkspaceSwitcher } from './WorkspaceSwitcher.js';

const TOAST_MS = 4000;

export interface LinkRelocationDependencies {
  context: ModuleContext;
  sources: EditingSources;
}

export class LinkRelocationFactory {
  /**
   * Builds what Move to of a saved tab does, with Vivaldi's workspace menu as the way to create a
   * workspace.
   *
   * @param dependencies What the relocation collaborates with.
   * @returns The relocation; null when the document has no window to drive the menu from.
   */
  public static create({ context, sources }: LinkRelocationDependencies): LinkRelocation | null {
    const { document, selectors, tabs, bookmarkWriter, logger } = context;
    const view = document.defaultView;
    if (view === null) {
      return null;
    }
    const parent = (): Element => document.querySelector(selectors.get('browser')) ?? document.body;
    const gestures = new ElementGestures(view);
    const poll = new Poll();
    const menu = new WorkspaceMenu(document, selectors, { gestures, poll, editor: new ReactEditorOpener(document, selectors, poll, new ReactInternals()) });
    const parts: MenuParts = { menu, quiet: new QuietMoment(document), names: sources.names, poll, logger };
    return new LinkRelocation({
      writer: bookmarkWriter,
      linkedTab: new LinkedTab(tabs),
      tabData: TabDataWriter.of(tabs),
      names: sources.names,
      active: sources.active,
      roots: sources.roots,
      hold: sources.closing,
      creator: new WorkspaceCreator(parts),
      switcher: new WorkspaceSwitcher(tabs, logger),
      dialog: new PromptDialog({ document, parent }),
      toast: new Toast({ document, parent: parent(), durationMs: TOAST_MS }),
      logger,
    });
  }
}
