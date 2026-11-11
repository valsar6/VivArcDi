const LEADING_WWW = /^www\./;
const TRAILING_SLASHES = /\/+$/;
const WEB_PROTOCOLS = /* @__PURE__ */ new Set(["http:", "https:"]);
function isWebAddress(url) {
  try {
    return WEB_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
}
function identityOf(url) {
  const parsed = new URL(url);
  return `${parsed.host.replace(LEADING_WWW, "")}${parsed.pathname.replace(TRAILING_SLASHES, "")}${parsed.search}`;
}
export {
  identityOf,
  isWebAddress
};
