import { LinkLabels } from "../../core/browser/LinkLabels.js";
import { EmojiCatalog } from "../emoji/EmojiCatalog.js";
import { FaviconReader } from "../icons/FaviconReader.js";
import { IconPicker } from "../icons/IconPicker.js";
import { IconSymbols } from "../icons/IconSymbols.js";
import { CHANGE_ICON_LABEL, RENAME_LABEL } from "../tabs/CommandLabels.js";
import { InPlaceEditor } from "./InPlaceEditor.js";
const NAME_LABEL = "Name";
const SAVE_NAME_FAILED = "Could not save the name";
const SAVE_ICON_FAILED = "Could not save the icon";
const READ_FAVICON_FAILED = "Could not read the favicon";
const imageLoads = (url) => new Promise((resolve) => {
  const image = new Image();
  image.addEventListener("load", () => resolve(true));
  image.addEventListener("error", () => resolve(false));
  image.src = url;
});
const pageParser = {
  parseFromString: (html, type) => new DOMParser().parseFromString(html, type)
};
class LabelCommands {
  #deps;
  #warned = false;
  /**
   * The `Change Icon…` and `Rename…` commands of a saved row or a Favorite tile. The name and the
   * icon belong to the label of the link, never to its bookmark title or address.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * @param context What the module may use.
   * @param sources Where the id is drawn and what its page is.
   * @returns The commands wired to the window's labels, editor, picker and favicon reader.
   */
  static of(context, sources) {
    const { document, selectors, storage, payload, logger } = context;
    const parent = () => document.querySelector(selectors.get("browser")) ?? document.body;
    return new LabelCommands({
      ...sources,
      labels: LinkLabels.of(storage, logger),
      editor: new InPlaceEditor({ document, parent }),
      picker: new IconPicker({ document, parent, catalog: () => EmojiCatalog.load(payload, logger), symbols: IconSymbols.all() }),
      favicon: new FaviconReader({ fetch: (url) => fetch(url), loadImage: imageLoads, parser: pageParser, logger }),
      logger
    });
  }
  /**
   * @param id The bookmark id of a row, or the id of a tile.
   * @returns `Change Icon…` and `Rename…`, or none when the id has no label key.
   */
  items(id) {
    const key = this.#deps.keyOf(id);
    if (key === null) {
      return [];
    }
    return [
      { label: CHANGE_ICON_LABEL, run: () => this.#guard(() => this.#changeIcon(id, key)) },
      { label: RENAME_LABEL, run: () => this.#guard(() => this.#rename(id, key)) }
    ];
  }
  async #rename(id, key) {
    const target = this.#target(id);
    if (target === null) {
      return;
    }
    const text = await this.#deps.editor.edit({ target, value: this.#deps.textOf(id), label: NAME_LABEL });
    if (text === null) {
      return;
    }
    await this.#save(key, { name: text === "" ? null : text }, SAVE_NAME_FAILED);
  }
  async #changeIcon(id, key) {
    const target = this.#target(id);
    if (target === null) {
      return;
    }
    const result = await this.#deps.picker.pick({ anchor: target.anchor, refresh: true });
    if (result === null) {
      return;
    }
    if ("reset" in result) {
      await this.#clear(key);
    } else if ("refresh" in result) {
      await this.#refresh(id, key);
    } else {
      await this.#save(key, { icon: result.icon, favicon: null }, SAVE_ICON_FAILED);
    }
  }
  async #refresh(id, key) {
    const page = await this.#deps.pageOf(id);
    const favicon = page === null ? null : await this.#deps.favicon.read(page);
    if (favicon === null) {
      this.#deps.notify(READ_FAVICON_FAILED, "error");
      return;
    }
    await this.#save(key, { favicon, icon: null }, SAVE_ICON_FAILED);
  }
  async #save(key, change, failure) {
    const outcome = await this.#deps.labels.set(key, change);
    if (outcome === "failed") {
      this.#deps.notify(failure, "error");
    }
  }
  async #clear(key) {
    const outcome = await this.#deps.labels.clear(key);
    if (outcome === "failed") {
      this.#deps.notify(SAVE_ICON_FAILED, "error");
    }
  }
  #target(id) {
    const target = this.#deps.target(id);
    if (target === null && !this.#warned) {
      this.#warned = true;
      this.#deps.logger.warn(`the label of ${id} has no element on screen`);
    }
    return target;
  }
  #guard(run) {
    void run().catch((error) => this.#deps.logger.warn("a label command failed", error));
  }
}
export {
  LabelCommands
};
