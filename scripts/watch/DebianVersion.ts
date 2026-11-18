interface Parts {
  epoch: number;
  upstream: string;
  revision: string;
}

const TILDE_ORDER = -1;
const NON_LETTER_OFFSET = 256;

/**
 * Compares two Debian package versions as dpkg does: epoch, then upstream version, then revision,
 * where `~` sorts before anything and digit runs compare as numbers.
 *
 * @param a A version, e.g. `8.4.4226.3-1`.
 * @param b Another version.
 * @returns A negative number when `a` is older, 0 when equal, a positive number when newer.
 */
export function compareDebianVersions(a: string, b: string): number {
  const left = parse(a);
  const right = parse(b);
  return (
    left.epoch - right.epoch ||
    compareSegments(left.upstream, right.upstream) ||
    compareSegments(left.revision, right.revision)
  );
}

/**
 * @param version A Debian version, e.g. `8.4.4226.3-1`.
 * @returns The upstream version, which is the Vivaldi version, e.g. `8.4.4226.3`.
 */
export function upstreamVersion(version: string): string {
  return parse(version).upstream;
}

function parse(version: string): Parts {
  const colon = version.indexOf(':');
  const epoch = colon === -1 ? 0 : Number(version.slice(0, colon));
  const rest = version.slice(colon + 1);
  const dash = rest.lastIndexOf('-');
  return dash === -1
    ? { epoch, upstream: rest, revision: '' }
    : { epoch, upstream: rest.slice(0, dash), revision: rest.slice(dash + 1) };
}

function isDigit(char: string | undefined): boolean {
  return char !== undefined && char >= '0' && char <= '9';
}

function order(char: string | undefined): number {
  if (char === undefined || isDigit(char)) {
    return 0;
  }
  if (char === '~') {
    return TILDE_ORDER;
  }
  const code = char.charCodeAt(0);
  return /[A-Za-z]/.test(char) ? code : code + NON_LETTER_OFFSET;
}

function compareSegments(a: string, b: string): number {
  const cursor = { a: 0, b: 0 };
  while (cursor.a < a.length || cursor.b < b.length) {
    const text = compareText(a, b, cursor);
    if (text !== 0) {
      return text;
    }
    const number = compareNumber(a, b, cursor);
    if (number !== 0) {
      return number;
    }
  }
  return 0;
}

function compareText(a: string, b: string, cursor: { a: number; b: number }): number {
  while ((cursor.a < a.length && !isDigit(a[cursor.a])) || (cursor.b < b.length && !isDigit(b[cursor.b]))) {
    const difference = order(a[cursor.a]) - order(b[cursor.b]);
    if (difference !== 0) {
      return difference;
    }
    cursor.a++;
    cursor.b++;
  }
  return 0;
}

function compareNumber(a: string, b: string, cursor: { a: number; b: number }): number {
  const left = digitsAt(a, cursor.a);
  const right = digitsAt(b, cursor.b);
  cursor.a += left.length;
  cursor.b += right.length;
  return Number(left || '0') - Number(right || '0');
}

function digitsAt(text: string, start: number): string {
  let end = start;
  while (isDigit(text[end])) {
    end++;
  }
  return text.slice(start, end);
}
