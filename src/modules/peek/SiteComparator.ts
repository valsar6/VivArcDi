const TWO_LABEL_SUFFIXES = new Set([
  'ac.uk', 'co.uk', 'gov.uk', 'ltd.uk', 'me.uk', 'net.uk', 'org.uk', 'plc.uk', 'sch.uk',
  'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
  'co.jp', 'ne.jp', 'or.jp', 'ac.jp', 'go.jp',
  'co.nz', 'org.nz', 'net.nz', 'govt.nz',
  'co.za', 'org.za', 'co.in', 'net.in', 'org.in', 'firm.in',
  'com.br', 'net.br', 'org.br', 'gov.br', 'com.mx', 'com.ar', 'com.tr', 'com.cn', 'net.cn', 'org.cn',
  'com.hk', 'com.sg', 'com.tw', 'co.kr', 'or.kr', 'co.il', 'co.id', 'com.my', 'com.ph',
  'github.io', 'gitlab.io', 'herokuapp.com', 'netlify.app', 'vercel.app', 'pages.dev', 'blogspot.com',
]);
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const SITE_LABELS = 2;

export class SiteComparator {
  /**
   * The site of a URL: its registrable domain, such as `google.com` for
   * `https://mail.google.com/` or `bbc.co.uk` for `https://www.bbc.co.uk/`.
   * IP addresses and single-label hosts are returned whole.
   *
   * @param url Absolute URL.
   * @returns The site, or null when the URL has no host.
   */
  public siteOf(url: string): string | null {
    const host = SiteComparator.#hostOf(url);
    if (host === null || IPV4.test(host) || host.startsWith('[') || !host.includes('.')) {
      return host;
    }
    const labels = host.split('.');
    const lastTwo = labels.slice(-SITE_LABELS).join('.');
    const kept = TWO_LABEL_SUFFIXES.has(lastTwo) ? SITE_LABELS + 1 : SITE_LABELS;
    return labels.slice(-kept).join('.');
  }

  /**
   * @param first Absolute URL.
   * @param second Absolute URL.
   * @returns Whether both URLs belong to the same site.
   */
  public sameSite(first: string, second: string): boolean {
    const site = this.siteOf(first);
    return site !== null && site === this.siteOf(second);
  }

  static #hostOf(url: string): string | null {
    try {
      const host = new URL(url).hostname.toLowerCase().replace(/\.$/, '');
      return host === '' ? null : host;
    } catch {
      return null;
    }
  }
}
