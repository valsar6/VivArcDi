const CALL_SITES = [{ id: "meet", hosts: ["meet.google.com"], selectorKey: "callMeetInCall" }];
function siteFor(url, options, selectors) {
  const host = hostOf(url);
  const site = CALL_SITES.find((candidate) => options[candidate.id] && host !== null && candidate.hosts.includes(host));
  if (site === void 0 || !selectors.has(site.selectorKey)) {
    return null;
  }
  return { site, inCallSelector: selectors.get(site.selectorKey) };
}
function hostOf(url) {
  try {
    const parsed = new URL(url ?? "");
    return parsed.protocol === "https:" ? parsed.hostname : null;
  } catch {
    return null;
  }
}
export {
  CALL_SITES,
  siteFor
};
