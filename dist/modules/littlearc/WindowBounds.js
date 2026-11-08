const PERCENT = 100;
class WindowBounds {
  /**
   * Sizes a window as a share of the screen and centres it.
   *
   * @param screen The usable area of the screen.
   * @param settings The share of the width and the height, in percent.
   * @returns Size and position in pixels.
   */
  static centred(screen, settings) {
    const width = Math.round(screen.width * settings.widthPercent / PERCENT);
    const height = Math.round(screen.height * settings.heightPercent / PERCENT);
    return {
      width,
      height,
      left: screen.left + Math.round((screen.width - width) / 2),
      top: screen.top + Math.round((screen.height - height) / 2)
    };
  }
}
export {
  WindowBounds
};
