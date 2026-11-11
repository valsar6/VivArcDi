const LEADING_WWW = /^www\./;
function suggestionOf(source, url, title, favicon) {
  try {
    const host = new URL(url ?? "").host.replace(LEADING_WWW, "");
    const text = (title ?? "").trim();
    return { url: url ?? "", title: text === "" ? host : text, host, source, favicon };
  } catch {
    return null;
  }
}
export {
  suggestionOf
};
