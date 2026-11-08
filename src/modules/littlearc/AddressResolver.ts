export type ResolvedAddress = { kind: 'url'; url: string } | { kind: 'search'; text: string };

const WEB_ADDRESS = /^https?:\/\/\S+$/i;
const HOST_PART = '(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z]{2,}';
const BARE_ADDRESS = new RegExp(`^(?:${HOST_PART}|localhost|\\d{1,3}(?:\\.\\d{1,3}){3})(?::\\d{1,5})?(?:[/?#]\\S*)?$`, 'i');
const LOCAL_ADDRESS = /^(?:localhost|\d{1,3}(?:\.\d{1,3}){3})(?::\d{1,5})?(?:[/?#]\S*)?$/i;

export class AddressResolver {
  /**
   * Decides what text typed in the address field means: a web address, written in full or without
   * its scheme, or a web search.
   *
   * @param typed The text typed by the user.
   * @returns The address to open or the text to search for; null when nothing was typed.
   */
  public static resolve(typed: string): ResolvedAddress | null {
    const text = typed.trim();
    if (text === '') {
      return null;
    }
    if (WEB_ADDRESS.test(text)) {
      return { kind: 'url', url: text };
    }
    if (BARE_ADDRESS.test(text)) {
      const scheme = LOCAL_ADDRESS.test(text) ? 'http' : 'https';
      return { kind: 'url', url: `${scheme}://${text}` };
    }
    return { kind: 'search', text };
  }
}
