import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import type { ModuleOptions } from '../../src/core/boot/types.js';
import { createDefaultRegistry } from '../../src/modules/index.js';
import { CdpConnection } from './cdp/CdpConnection.js';
import { WindowTarget } from './cdp/WindowTarget.js';
import { BootCheck } from './checks/BootCheck.js';
import { SelectorCheck } from './checks/SelectorCheck.js';
import type { StateMap } from './checks/SelectorStates.js';
import { Cleanup } from './Cleanup.js';
import { LabVivaldi } from './LabVivaldi.js';
import type { LabOptions } from './LabVivaldi.js';
import { LiveRun } from './LiveRun.js';
import { PayloadServer } from './PayloadServer.js';
import type { LiveRunParts, RunningVivaldi } from './LiveRun.js';
import { ProbeRunner } from './probe/ProbeRunner.js';
import { ProfileDirectory } from './ProfileDirectory.js';
import { Report } from './Report.js';
import { ScenarioCatalog, ScenarioCheck } from './scenarios/ScenarioCatalog.js';
import type { Scenario } from './scenarios/ScenarioCatalog.js';
import { spawnVivaldi, VivaldiProcess } from './VivaldiProcess.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LIVE_TESTS = join(ROOT, 'tests', 'live');

interface Options {
  only: string[];
  probe?: string;
  lab: LabOptions;
}

interface DistConfig {
  modules: Record<string, ModuleOptions>;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function options(argv: string[]): Options {
  const { values } = parseArgs({
    args: argv,
    options: {
      only: { type: 'string', multiple: true, default: [] },
      probe: { type: 'string' },
      vivaldi: { type: 'string' },
      channel: { type: 'string', default: 'stable' },
    },
  });
  const lab: LabOptions = { channel: values.channel === 'snapshot' ? 'snapshot' : 'stable' };
  if (values.vivaldi !== undefined) {
    lab.vivaldiRoot = values.vivaldi;
  }
  return values.probe === undefined ? { only: values.only, lab } : { only: values.only, probe: values.probe, lab };
}

async function launch(executable: string, profile: string): Promise<RunningVivaldi> {
  try {
    return await VivaldiProcess.start(executable, profile, spawnVivaldi);
  } catch (error) {
    if (process.platform !== 'linux') {
      throw error;
    }
    console.warn('Vivaldi did not start with its sandbox; retrying the lab copy with --no-sandbox');
    return VivaldiProcess.start(executable, profile, spawnVivaldi, ['--no-sandbox']);
  }
}

function modulesOfNormalWindow(): string[] {
  const config = readJson<DistConfig>(join(ROOT, 'dist', 'config.json'));
  return createDefaultRegistry().createEnabled(config.modules, false).modules.map(({ id }) => id);
}

function parts(opts: Options, scenarios: Scenario[]): LiveRunParts {
  const { version } = readJson<{ version: string }>(join(ROOT, 'package.json'));
  return {
    prepareLab: () => new LabVivaldi(join(ROOT, 'scripts', 'live', 'lab.py')).prepare(opts.lab),
    servePayload: (vivaldiVersion) =>
      PayloadServer.start(join(ROOT, 'dist'), { vivarcdiVersion: version, vivaldiVersion, payloadFingerprint: 'live' }),
    createProfile: () => ProfileDirectory.temporary(join(LIVE_TESTS, 'profile', 'Preferences.json')),
    launch,
    attach: async (endpoint) => CdpConnection.connect(await WindowTarget.find(endpoint)),
    catalog: (version) => SelectorCheck.catalogFor(join(ROOT, 'src', 'selectors'), version),
    checks: (catalog) => [
      new BootCheck(modulesOfNormalWindow()),
      new SelectorCheck(catalog.selectors, readJson<StateMap>(join(LIVE_TESTS, 'selector-states.json'))),
      ...scenarios.map((scenario) => new ScenarioCheck(scenario)),
    ],
    report: new Report(join(ROOT, 'build', 'live')),
    payloadVersion: version,
  };
}

async function main(argv: string[]): Promise<number> {
  const opts = options(argv);
  const scenarios = ScenarioCatalog.select(await ScenarioCatalog.load(join(LIVE_TESTS, 'scenarios')), opts.only);
  const cleanup = new Cleanup();
  cleanup.onSignals(process);
  const run = new LiveRun(parts(opts, scenarios), cleanup);
  if (opts.probe !== undefined) {
    const source = await readFile(opts.probe, 'utf8');
    const result = await run.with((session) => new ProbeRunner(session.driver).run(source));
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }
  const code = await run.run();
  console.log(`Report: ${join('build', 'live', 'report.md')}`);
  return code;
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
