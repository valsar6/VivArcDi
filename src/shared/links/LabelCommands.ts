import type { LabelChange } from '../../core/browser/LinkLabels.js';
import { LinkLabels } from '../../core/browser/LinkLabels.js';
import type { ModuleContext } from '../../core/boot/Module.js';
import type { MenuItem } from '../../core/dom/ContextMenu.js';
import type { ToastKind } from '../../core/dom/Toast.js';
import type { Logger } from '../../core/support/Logger.js';
import { EmojiCatalog } from '../emoji/EmojiCatalog.js';
import { FaviconReader } from '../icons/FaviconReader.js';
import type { PageParser } from '../icons/FaviconReader.js';
import { IconPicker } from '../icons/IconPicker.js';
import { IconSymbols } from '../icons/IconSymbols.js';
import { CHANGE_ICON_LABEL, RENAME_LABEL } from '../tabs/CommandLabels.js';
import { InPlaceEditor } from './InPlaceEditor.js';
import type { EditTarget } from './InPlaceEditor.js';

const NAME_LABEL = 'Name';
const SAVE_NAME_FAILED = 'Could not save the name';
const SAVE_ICON_FAILED = 'Could not save the icon';
const READ_FAVICON_FAILED = 'Could not read the favicon';

export interface LabelCommandsDependencies {
  labels: Pick<LinkLabels, 'get' | 'set' | 'clear'>;
  editor: Pick<InPlaceEditor, 'edit'>;
  picker: Pick<IconPicker, 'pick'>;
  favicon: Pick<FaviconReader, 'read'>;
  keyOf: (id: string) => string | null;
  target: (id: string) => EditTarget | null;
  textOf: (id: string) => string;
  pageOf: (id: string) => Promise<{ url: string; tab?: chrome.tabs.Tab } | null>;
  notify: (text: string, kind?: ToastKind) => void;
  logger: Logger;
}

export interface LabelCommandSources {
  keyOf: (id: string) => string | null;
  target: (id: string) => EditTarget | null;
  textOf: (id: string) => string;
  pageOf: (id: string) => Promise<{ url: string; tab?: chrome.tabs.Tab } | null>;
  notify: (text: string, kind?: ToastKind) => void;
}

const imageLoads = (url: string): Promise<boolean> =>
  new Promise((resolve) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(true));
    image.addEventListener('error', () => resolve(false));
    image.src = url;
  });

const pageParser: PageParser = {
  parseFromString: (html, type) => new DOMParser().parseFromString(html, type),
};

export class LabelCommands {
  #deps: LabelCommandsDependencies;
  #warned = false;

  /**
   * The `Change Icon…` and `Rename…` commands of a saved row or a Favorite tile. The name and the
   * icon belong to the label of the link, never to its bookmark title or address.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: LabelCommandsDependencies) {
    this.#deps = dependencies;
  }

  /**
   * @param context What the module may use.
   * @param sources Where the id is drawn and what its page is.
   * @returns The commands wired to the window's labels, editor, picker and favicon reader.
   */
  public static of(context: ModuleContext, sources: LabelCommandSources): LabelCommands {
    const { document, selectors, storage, payload, logger } = context;
    const parent = (): Element => document.querySelector(selectors.get('browser')) ?? document.body;
    return new LabelCommands({
      ...sources,
      labels: LinkLabels.of(storage, logger),
      editor: new InPlaceEditor({ document, parent }),
      picker: new IconPicker({ document, parent, catalog: () => EmojiCatalog.load(payload, logger), symbols: IconSymbols.all() }),
      favicon: new FaviconReader({ fetch: (url) => fetch(url), loadImage: imageLoads, parser: pageParser, logger }),
      logger,
    });
  }

  /**
   * @param id The bookmark id of a row, or the id of a tile.
   * @returns `Change Icon…` and `Rename…`, or none when the id has no label key.
   */
  public items(id: string): MenuItem[] {
    const key = this.#deps.keyOf(id);
    if (key === null) {
      return [];
    }
    return [
      { label: CHANGE_ICON_LABEL, run: (): void => this.#guard(() => this.#changeIcon(id, key)) },
      { label: RENAME_LABEL, run: (): void => this.#guard(() => this.#rename(id, key)) },
    ];
  }

  async #rename(id: string, key: string): Promise<void> {
    const target = this.#target(id);
    if (target === null) {
      return;
    }
    const text = await this.#deps.editor.edit({ target, value: this.#deps.textOf(id), label: NAME_LABEL });
    if (text === null) {
      return;
    }
    await this.#save(key, { name: text === '' ? null : text }, SAVE_NAME_FAILED);
  }

  async #changeIcon(id: string, key: string): Promise<void> {
    const target = this.#target(id);
    if (target === null) {
      return;
    }
    const result = await this.#deps.picker.pick({ anchor: target.anchor, refresh: true });
    if (result === null) {
      return;
    }
    if ('reset' in result) {
      await this.#clear(key);
    } else if ('refresh' in result) {
      await this.#refresh(id, key);
    } else {
      await this.#save(key, { icon: result.icon, favicon: null }, SAVE_ICON_FAILED);
    }
  }

  async #refresh(id: string, key: string): Promise<void> {
    const page = await this.#deps.pageOf(id);
    const favicon = page === null ? null : await this.#deps.favicon.read(page);
    if (favicon === null) {
      this.#deps.notify(READ_FAVICON_FAILED, 'error');
      return;
    }
    await this.#save(key, { favicon, icon: null }, SAVE_ICON_FAILED);
  }

  async #save(key: string, change: LabelChange, failure: string): Promise<void> {
    const outcome = await this.#deps.labels.set(key, change);
    if (outcome === 'failed') {
      this.#deps.notify(failure, 'error');
    }
  }

  async #clear(key: string): Promise<void> {
    const outcome = await this.#deps.labels.clear(key);
    if (outcome === 'failed') {
      this.#deps.notify(SAVE_ICON_FAILED, 'error');
    }
  }

  #target(id: string): EditTarget | null {
    const target = this.#deps.target(id);
    if (target === null && !this.#warned) {
      this.#warned = true;
      this.#deps.logger.warn(`the label of ${id} has no element on screen`);
    }
    return target;
  }

  #guard(run: () => Promise<void>): void {
    void run().catch((error: unknown) => this.#deps.logger.warn('a label command failed', error));
  }
}
