const TAB_ID_ATTRIBUTE = "tab_id";
function tabIdOf(webview) {
  const tabId = Number(webview.getAttribute(TAB_ID_ATTRIBUTE));
  return Number.isInteger(tabId) && tabId > 0 ? tabId : null;
}
export {
  TAB_ID_ATTRIBUTE,
  tabIdOf
};
