import type { DestinationColors } from './LittleArcMessage.js';

const NAMES = ['space', 'pill', 'ink'] as const;
const propertyOf = (name: string): string => `--vivarcdi-${name}`;

export class DestinationPalette {
  /**
   * Reads the colors that the sidebar look put on a window's root, the variables of
   * `--vivarcdi-space`, `--vivarcdi-pill` and `--vivarcdi-ink`.
   *
   * @param root The root element of a window (`#browser`), or null.
   * @returns The three colors, or null when the sidebar look did not set them.
   */
  public static read(root: HTMLElement | null): DestinationColors | null {
    if (root === null) {
      return null;
    }
    const read = (name: string): string => root.style.getPropertyValue(propertyOf(name)).trim();
    const colors = { space: read('space'), pill: read('pill'), ink: read('ink') };
    return Object.values(colors).every((value) => value !== '') ? colors : null;
  }

  /**
   * Sets the colors on the root of a window, the same variables the sidebar look uses.
   *
   * @param root The root element of a window.
   * @param colors The colors to set.
   */
  public static apply(root: HTMLElement, colors: DestinationColors): void {
    NAMES.forEach((name) => root.style.setProperty(propertyOf(name), colors[name]));
  }

  /**
   * Removes the variables that `apply` set.
   *
   * @param root The root element of a window.
   */
  public static clear(root: HTMLElement): void {
    NAMES.forEach((name) => root.style.removeProperty(propertyOf(name)));
  }
}
