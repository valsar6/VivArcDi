import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { GhCli, LIST_LIMIT } from './GhCli.js';
import { ReportFolder } from './ReportFolder.js';
import { ReportText } from './ReportText.js';
import { SpecTimeline } from './SpecTimeline.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const USAGE = 'Usage: review-wait [--since YYYY-MM-DD] [--out <dir>]';
const DAY_LENGTH = 'YYYY-MM-DD'.length;

function parseSince(value: string | undefined): Date | null | undefined {
  if (value === undefined) {
    return null;
  }
  const since = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(since.getTime()) ? undefined : since;
}

async function main(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: { since: { type: 'string' }, out: { type: 'string' } },
  });
  const since = parseSince(values.since);
  if (since === undefined) {
    console.error(USAGE);
    return 2;
  }
  const merged = await new GhCli().merged();
  const today = new Date();
  const ceiling = merged.length >= LIST_LIMIT ? `\n\nThe list reached ${LIST_LIMIT} pull requests: older ones are missing.\n` : '\n';
  const report = ReportText.write(SpecTimeline.build(merged, since), { since, today }) + ceiling;
  const file = ReportFolder.resolve({
    out: values.out ?? null,
    root: ROOT,
    exists: existsSync,
    day: today.toISOString().slice(0, DAY_LENGTH),
  });
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, report);
  console.log(report);
  console.log(`Saved in ${file}`);
  return 0;
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
