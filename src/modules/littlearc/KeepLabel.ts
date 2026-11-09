export interface KeepLabelParts {
  /** The words before the workspace name. */
  prefix: string;
  /** The destination workspace, or `workspace` when it is not known. */
  name: string;
  /** The shortcut of the platform. */
  shortcut: string;
}

const UNKNOWN_NAME = 'workspace';

export class KeepLabel {
  /**
   * @param platform The value of `navigator.platform`.
   * @returns Whether it is macOS.
   */
  public static isMac(platform: string): boolean {
    return platform.toLowerCase().startsWith('mac');
  }

  /**
   * The text of the button that keeps the page: "Open in", the workspace in bold and the shortcut.
   *
   * @param name The name of the destination workspace, or nothing when it is not known.
   * @param platform The value of `navigator.platform`.
   * @returns The three parts of the label.
   */
  public static of(name: string | null | undefined, platform: string): KeepLabelParts {
    const known = (name ?? '').trim();
    return {
      prefix: 'Open in',
      name: known === '' ? UNKNOWN_NAME : known,
      shortcut: KeepLabel.isMac(platform) ? '⌘O' : 'Ctrl+O',
    };
  }
}
