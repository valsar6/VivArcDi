export type WorkspaceChoice = (workspaces: string[]) => Promise<string | null>;

export class DestinationPicker {
  #ask: boolean;
  #choose: WorkspaceChoice;

  /**
   * Decides which workspace receives a page kept from Little Arc: the most recent one, unless the
   * user asked to be asked.
   *
   * @param ask Whether to let the user pick.
   * @param choose Shows the workspaces and returns the one picked, or null when none was.
   */
  constructor(ask: boolean, choose: WorkspaceChoice) {
    this.#ask = ask;
    this.#choose = choose;
  }

  /**
   * @param recent The most recent workspace, or null when it is not known.
   * @param available Every workspace of the window.
   * @returns The workspace to use, or null to leave the tab where Vivaldi puts it.
   */
  public async pick(recent: string | null, available: string[]): Promise<string | null> {
    if (!this.#ask || available.length === 0) {
      return recent;
    }
    return (await this.#choose(available)) ?? recent;
  }
}
