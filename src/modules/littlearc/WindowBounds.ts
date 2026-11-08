export interface ScreenArea {
  width: number;
  height: number;
  left: number;
  top: number;
}

export interface WindowBoundsSettings {
  widthPercent: number;
  heightPercent: number;
}

export interface Bounds {
  width: number;
  height: number;
  left: number;
  top: number;
}

const PERCENT = 100;

export class WindowBounds {
  /**
   * Sizes a window as a share of the screen and centres it.
   *
   * @param screen The usable area of the screen.
   * @param settings The share of the width and the height, in percent.
   * @returns Size and position in pixels.
   */
  public static centred(screen: ScreenArea, settings: WindowBoundsSettings): Bounds {
    const width = Math.round((screen.width * settings.widthPercent) / PERCENT);
    const height = Math.round((screen.height * settings.heightPercent) / PERCENT);
    return {
      width,
      height,
      left: screen.left + Math.round((screen.width - width) / 2),
      top: screen.top + Math.round((screen.height - height) / 2),
    };
  }
}
