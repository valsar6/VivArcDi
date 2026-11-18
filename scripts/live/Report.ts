import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ConsoleLine } from './ConsoleLog.js';

export type Outcome = 'pass' | 'fail' | 'not checked';

export interface CheckResult {
  name: string;
  outcome: Outcome;
  detail: string;
  screenshot?: string;
}

export interface RunFacts {
  vivaldiVersion: string;
  payloadVersion: string;
  catalogVersion: string | null;
}

const MARKS: Record<Outcome, string> = { pass: 'pass', fail: '**FAIL**', 'not checked': 'not checked' };

export class Report {
  #dir: string;
  #results: CheckResult[] = [];
  #console: ConsoleLine[] = [];

  /**
   * Collects the results of a live run and writes them as JSON, Markdown and screenshots.
   *
   * @param dir Output folder, e.g. `build/live`.
   */
  constructor(dir: string) {
    this.#dir = dir;
  }

  /**
   * @param results Results of one check.
   */
  public add(results: CheckResult[]): void {
    this.#results.push(...results);
  }

  /**
   * @param lines The VivArcDi console lines of window.html.
   */
  public setConsole(lines: ConsoleLine[]): void {
    this.#console = lines;
  }

  /**
   * @returns Whether a check failed.
   */
  public get failed(): boolean {
    return this.#results.some((result) => result.outcome === 'fail');
  }

  /**
   * @returns The results added so far.
   */
  public get results(): CheckResult[] {
    return [...this.#results];
  }

  /**
   * Saves a screenshot next to the report and links it from the given results.
   *
   * @param label File name stem, usually the name of the check.
   * @param png The image.
   * @param results The failed results the screenshot belongs to.
   * @returns The path of the saved file.
   */
  public async saveScreenshot(label: string, png: Buffer, results: CheckResult[]): Promise<string> {
    const folder = join(this.#dir, 'screenshots');
    await mkdir(folder, { recursive: true });
    const path = join(folder, `${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`);
    await writeFile(path, png);
    results.forEach((result) => (result.screenshot = path));
    return path;
  }

  /**
   * Saves the markup of window.html, from which broken selectors can be fixed without Vivaldi.
   *
   * @param html The `outerHTML` of the document.
   * @returns The path of the saved file.
   */
  public async saveDom(html: string): Promise<string> {
    await mkdir(this.#dir, { recursive: true });
    const path = join(this.#dir, 'window.html');
    await writeFile(path, html);
    return path;
  }

  /**
   * Writes `report.json` and `report.md`.
   *
   * @param facts The versions under test.
   * @returns The path of the Markdown summary.
   */
  public async write(facts: RunFacts): Promise<string> {
    await mkdir(this.#dir, { recursive: true });
    const body = { ...facts, failed: this.failed, results: this.#results, console: this.#console };
    await writeFile(join(this.#dir, 'report.json'), `${JSON.stringify(body, null, 2)}\n`);
    const summary = join(this.#dir, 'report.md');
    await writeFile(summary, this.#markdown(facts));
    return summary;
  }

  #markdown(facts: RunFacts): string {
    const rows = this.#results.map((result) => {
      const shot = result.screenshot === undefined ? '' : ` ([screenshot](${result.screenshot}))`;
      return `| ${result.name} | ${MARKS[result.outcome]} | ${result.detail}${shot} |`;
    });
    return [
      '# VivArcDi live run',
      '',
      `Vivaldi ${facts.vivaldiVersion}, VivArcDi ${facts.payloadVersion}, selectors ${facts.catalogVersion ?? 'none'}.`,
      '',
      '| Check | Result | Detail |',
      '|---|---|---|',
      ...rows,
      '',
      '## Console',
      '',
      ...this.#console.map((line) => `- ${line.level}: ${line.text}`),
      '',
    ].join('\n');
  }
}
