import { STAGES, type SpecRow, type Timeline } from './SpecTimeline.js';
import type { Stage } from './StageRules.js';

export interface ReportContext {
  since: Date | null;
  today: Date;
}

const MS_PER_HOUR = 3_600_000;
const HOURS_PER_DAY = 24;
const MISSING = '–';
const ACCOUNT_NOTE =
  'Times come from the opening and merge of the pull requests; GitHub does not tell Tore from the agent.';
const STAGE_LABELS: Record<Stage, string> = {
  spec: 'Spec',
  design: 'Design',
  code: 'Code',
  implemented: 'Implemented',
};

function day(date: Date): string {
  return date.toISOString().slice(0, 'YYYY-MM-DD'.length);
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) {
    return MISSING;
  }
  const hours = Math.round(ms / MS_PER_HOUR);
  const days = Math.floor(hours / HOURS_PER_DAY);
  return days > 0 ? `${days} d ${hours % HOURS_PER_DAY} h` : `${hours} h`;
}

function stageTable(timeline: Timeline): string[] {
  const lines = ['| Stage | Pull requests | Median | Longest |', '|---|---|---|---|'];
  for (const stage of STAGES) {
    const { count, median, longest } = timeline.stages[stage];
    const empty = count === 0;
    lines.push(
      `| ${STAGE_LABELS[stage]} | ${count} | ${empty ? MISSING : formatDuration(median)} | ${empty ? MISSING : formatDuration(longest)} |`,
    );
  }
  return lines;
}

function specLine(row: SpecRow): string {
  const cells = STAGES.map((stage) => formatDuration(row.waits[stage]));
  return `| ${[row.spec, ...cells, formatDuration(row.manual), formatDuration(row.cycle)].join(' | ')} |`;
}

function specTable(timeline: Timeline): string[] {
  const header = '| Spec | Spec | Design | Code | Implemented | Manual checks | Cycle |';
  return [header, '|---|---|---|---|---|---|---|', ...timeline.specs.map(specLine)];
}

export class ReportText {
  /**
   * Writes the review wait report as markdown.
   *
   * @param timeline The timeline to report.
   * @param context The period asked for and the day of the run.
   * @returns The markdown: header, per-stage table, per-spec table and the count apart.
   */
  public static write(timeline: Timeline, context: ReportContext): string {
    const period = context.since === null ? 'all merged pull requests' : `merged since ${day(context.since)}`;
    return [
      '# Review wait',
      '',
      `Period: ${period}. Run on ${day(context.today)}.`,
      '',
      ACCOUNT_NOTE,
      '',
      '## Stages',
      '',
      ...stageTable(timeline),
      '',
      '## Specs',
      '',
      ...specTable(timeline),
      '',
      `Counted apart (no spec or no stage): ${timeline.apart}`,
      '',
    ].join('\n');
  }
}
