const FAVICON_URL = 'chrome://favicon/size/16@2x/';

export class LinkIcon {
  /**
   * Makes the icon of a link: the favicon of its open tab when there is one, else the one Vivaldi
   * keeps for the address. Use `fallback` to replace an icon that fails to load.
   *
   * @param document The browser window document.
   * @param link The link.
   * @param link.url Its address.
   * @param link.title Its title, whose first letter replaces a missing icon.
   * @param className The class of the icon.
   * @param favIconUrl The favicon of the open tab, if known.
   * @returns The `img` element.
   */
  public static create(document: Document, { url, title }: { url: string; title: string }, className: string, favIconUrl?: string): HTMLElement {
    const icon = document.createElement('img');
    icon.className = className;
    icon.setAttribute('alt', '');
    icon.setAttribute('src', favIconUrl ?? `${FAVICON_URL}${url}`);
    icon.setAttribute('data-letter', (title.trim()[0] ?? '?').toUpperCase());
    return icon;
  }

  /**
   * Replaces an icon that failed to load with the first letter of the title. Meant for an `error`
   * listener in the capture phase, since image errors do not bubble.
   *
   * @param event The error event.
   * @param className The class of the letter.
   */
  public static fallback(event: Event, className: string): void {
    const target = event.target as HTMLElement | null;
    if (target?.tagName === 'IMG') {
      const letter = target.ownerDocument.createElement('span');
      letter.className = className;
      letter.textContent = target.getAttribute('data-letter');
      target.replaceWith(letter);
    }
  }
}
