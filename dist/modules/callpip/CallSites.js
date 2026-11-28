const CALL_SITES = [
  {
    id: "meet",
    hosts: ["meet.google.com"],
    selectorKeys: {
      inCall: "callMeetInCall",
      tile: "callMeetTile",
      avatar: "callMeetTileAvatar",
      microphone: "callMeetMicrophone",
      camera: "callMeetCamera"
    }
  }
];
function siteFor(url, options, selectors) {
  const host = hostOf(url);
  const site = CALL_SITES.find((candidate) => options[candidate.id] && host !== null && candidate.hosts.includes(host));
  if (site === void 0 || !Object.values(site.selectorKeys).every((key) => selectors.has(key))) {
    return null;
  }
  const resolved = Object.fromEntries(Object.entries(site.selectorKeys).map(([name, key]) => [name, selectors.get(key)]));
  return { site, selectors: resolved };
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
