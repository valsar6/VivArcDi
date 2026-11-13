import { BrowserSearch } from "../../../core/browser/BrowserSearch.js";
import { AddressResolver } from "../AddressResolver.js";
const MAX_ROWS = 5;
const LEADING_WWW = /^www\./;
function typedRow(text) {
  const resolved = AddressResolver.resolve(text);
  if (resolved === null) {
    return null;
  }
  if (resolved.kind === "search") {
    return { url: BrowserSearch.fallbackAddress(resolved.text), title: `Search for ${resolved.text}`, host: "", icon: "search" };
  }
  return { url: resolved.url, title: `Open ${new URL(resolved.url).host.replace(LEADING_WWW, "")}`, host: "", icon: "globe" };
}
function suggestionRow(suggestion) {
  return { url: suggestion.url, title: suggestion.title, host: suggestion.host, icon: "favicon", favicon: suggestion.favicon };
}
export {
  MAX_ROWS,
  suggestionRow,
  typedRow
};
