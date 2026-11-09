import { AddressDisplay } from "./AddressDisplay.js";
const FIRST_ADDRESS = 1;
class BackButtonState {
  #addresses = 0;
  #last = "";
  /**
   * Notes an address of the window's tab. Repeats and addresses that are not `http(s)` are ignored.
   *
   * @param address The new address of the tab.
   */
  record(address) {
    if (address === null || address === void 0 || !AddressDisplay.isWeb(address) || address === this.#last) {
      return;
    }
    this.#last = address;
    this.#addresses += 1;
  }
  /**
   * @returns Whether the back button shows.
   */
  get visible() {
    return this.#addresses > FIRST_ADDRESS;
  }
}
export {
  BackButtonState
};
