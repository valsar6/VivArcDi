import { AddressDisplay } from './AddressDisplay.js';

const FIRST_ADDRESS = 1;

/**
 * Decides when the back button shows: hidden until the page has navigated inside the window. The first
 * `http(s)` address is where the window starts, every different one after it is a navigation.
 */
export class BackButtonState {
  #addresses = 0;
  #last = '';

  /**
   * Notes an address of the window's tab. Repeats and addresses that are not `http(s)` are ignored.
   *
   * @param address The new address of the tab.
   */
  public record(address: string | null | undefined): void {
    if (address === null || address === undefined || !AddressDisplay.isWeb(address) || address === this.#last) {
      return;
    }
    this.#last = address;
    this.#addresses += 1;
  }

  /**
   * @returns Whether the back button shows.
   */
  public get visible(): boolean {
    return this.#addresses > FIRST_ADDRESS;
  }
}
