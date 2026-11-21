import { COPIED_TEXT, FAILED_TEXT } from "./LinkTexts.js";
class LinkClipboard {
  #deps;
  /**
   * Copies the saved address of a link row, not the address of its tab, and tells the user.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * @param linkId The bookmark id of the link row.
   */
  async copy(linkId) {
    try {
      const { url } = await this.#deps.writer.get(linkId);
      if (url === void 0) {
        throw new Error("the bookmark has no address");
      }
      await this.#deps.copier.write(url);
      this.#deps.notify(COPIED_TEXT);
    } catch (error) {
      this.#deps.logger.warn("could not copy the link", error);
      this.#deps.notify(FAILED_TEXT, "error");
    }
  }
}
export {
  LinkClipboard
};
