export type Channel = 'snapshot' | 'stable';
export type WatchOutcome = 'pass' | 'fail' | 'infrastructure';

export interface Failure {
  name: string;
  detail: string;
}

export interface WatchResult {
  channel: Channel;
  version: string;
  outcome: WatchOutcome;
  failures: Failure[];
  runUrl: string;
}

export const WATCH_LABEL = 'snapshot-watch';
export const INFRASTRUCTURE_LABEL = 'infrastructure';

const HEADINGS: Record<WatchOutcome, string> = {
  pass: 'passes the live checks',
  fail: 'fails the live checks',
  infrastructure: 'could not be checked (infrastructure failure, not a broken selector)',
};

export class IssueText {
  /**
   * @param channel The Vivaldi channel.
   * @returns The label that groups the issues of one channel.
   */
  public static channelLabel(channel: Channel): string {
    return `channel:${channel}`;
  }

  /**
   * @param channel The Vivaldi channel.
   * @param version The Vivaldi version.
   * @returns The title of the issue of that build.
   */
  public static title(channel: Channel, version: string): string {
    return `Vivaldi ${channel} ${version} breaks VivArcDi`;
  }

  /**
   * @param title An issue title.
   * @param channel The channel the issue belongs to.
   * @returns The Vivaldi version named in the title, or null when the title is not one of ours.
   */
  public static versionIn(title: string, channel: Channel): string | null {
    const match = new RegExp(`^Vivaldi ${channel} (\\S+) breaks VivArcDi$`).exec(title);
    return match?.[1] ?? null;
  }

  /**
   * The text of a new issue or of a comment on one: what failed and where the evidence is.
   *
   * @param result The result of one watch run.
   * @returns Markdown.
   */
  public static report(result: WatchResult): string {
    const rows = result.failures.map((failure) => `| ${failure.name} | ${failure.detail.replace(/\|/g, '\\|')} |`);
    const table = rows.length === 0 ? [] : ['| Check | Detail |', '|---|---|', ...rows, ''];
    return [
      `Vivaldi ${result.channel} ${result.version} ${HEADINGS[result.outcome]}.`,
      '',
      ...table,
      `Run: ${result.runUrl}`,
      `Artifact \`live-${result.channel}-${result.version}\` on that run: report, screenshots, DOM of window.html.`,
    ].join('\n');
  }
}
