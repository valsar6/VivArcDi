const FALLBACK_WIDTH = 1280;
const FALLBACK_HEIGHT = 800;
function screenOf(document) {
  const screen = document.defaultView?.screen;
  if (screen === void 0) {
    return { width: FALLBACK_WIDTH, height: FALLBACK_HEIGHT, left: 0, top: 0 };
  }
  return { width: screen.availWidth, height: screen.availHeight, left: screen.availLeft ?? 0, top: screen.availTop ?? 0 };
}
export {
  screenOf
};
