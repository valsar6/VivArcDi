import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BootReport, bootNoticeText } from '../../../src/core/boot/BootReport.js';
import type { BootOutcome, BootStage, CatalogFacts, ModuleOutcome } from '../../../src/core/boot/BootReport.js';
import { Notices } from '../../../src/core/dom/Notices.js';
import { Logger } from '../../../src/core/support/Logger.js';
import { RecordingToast, SilentSink } from '../../loader/fakes.js';

const BUILD = { vivarcdiVersion: '0.1.0', vivaldiVersion: '8.1.3740.12' };
const OFF = 'off: 0 in config, 0 for this window, 0 by options; undefined selectors: 0';

const catalogOf = (version: string | null, undefinedNames: string[] = [], stands = false): CatalogFacts => ({
  version,
  undefinedNames,
  standsInFor: () => stands,
});

const setup = (): { sink: SilentSink; report: BootReport } => {
  const sink = new SilentSink();
  return { sink, report: new BootReport(new Logger('test:boot', sink)) };
};

const levelOf = (
  outcomes: Array<[string, ModuleOutcome]>,
  outcome: BootOutcome = 'active',
  undefinedNames: string[] = [],
): string => {
  const { sink, report } = setup();
  report.useBuild(BUILD);
  report.useCatalog(catalogOf('8.1', undefinedNames));
  for (const [id, result] of outcomes) {
    report.record(id, result);
  }
  report.summarize(outcome);
  return String(sink.lines[sink.lines.length - 1]?.[0]);
};

const failedAt = (stage: BootStage): string => {
  const { sink, report } = setup();
  if (stage !== 'config') {
    report.useBuild(BUILD);
  }
  if (stage === 'interface' || stage === 'modules') {
    report.useCatalog(catalogOf('8.1'));
  }
  report.enter(stage);
  report.summarize('failed');
  assert.equal(sink.lines[0]?.[0], 'error');
  return String(sink.lines[0]?.[2]);
};

test('summary line has the same fields for every result', () => {
  const { sink, report } = setup();
  report.useBuild(BUILD);
  report.useCatalog(catalogOf('8.1'));
  report.skip(1, 2);
  report.record('a', 'started');
  report.record('b', 'failed');
  report.record('c', 'invalid-options');
  report.summarize('active');
  assert.deepEqual(sink.lines, [
    [
      'warn',
      '[test:boot]',
      'self-check: active, 1 of 2 modules started, 1 failed: b (VivArcDi 0.1.0, Vivaldi 8.1.3740.12, selectors 8.1); off: 1 in config, 2 for this window, 1 by options; undefined selectors: 0',
    ],
  ]);

  const inactive = setup();
  inactive.report.useBuild(BUILD);
  inactive.report.useCatalog(catalogOf(null));
  inactive.report.summarize('inactive');
  assert.equal(
    inactive.sink.lines[0]?.[2],
    `self-check: inactive, 0 of 0 modules started, 0 failed (VivArcDi 0.1.0, Vivaldi 8.1.3740.12, selectors none); ${OFF}`,
  );

  const head = (stage: string, versions: string): string =>
    `self-check: failed at ${stage}, 0 of 0 modules started, 0 failed (${versions}); ${OFF}`;
  const known = 'VivArcDi 0.1.0, Vivaldi 8.1.3740.12';
  assert.equal(failedAt('config'), head('config', 'VivArcDi unknown, Vivaldi unknown, selectors unknown'));
  assert.equal(failedAt('selectors'), head('selectors', `${known}, selectors unknown`));
  assert.equal(failedAt('interface'), head('interface', `${known}, selectors 8.1`));
  assert.equal(failedAt('modules'), head('modules', `${known}, selectors 8.1`));
});

test('summary level follows the problems', () => {
  assert.equal(levelOf([['a', 'started']]), 'info');
  assert.equal(levelOf([]), 'info');
  assert.equal(
    levelOf([
      ['a', 'started'],
      ['b', 'failed'],
    ]),
    'warn',
  );
  assert.equal(levelOf([['a', 'invalid-options']]), 'warn');
  assert.equal(levelOf([['a', 'started']], 'active', ['missing']), 'warn');
  assert.equal(levelOf([], 'inactive'), 'warn');
  assert.equal(
    levelOf([
      ['a', 'failed'],
      ['b', 'failed'],
    ]),
    'error',
  );
  assert.equal(levelOf([], 'failed'), 'error');

  const standIn = setup();
  standIn.report.useBuild({ vivarcdiVersion: '0.1.0', vivaldiVersion: '8.3.4191.44' });
  standIn.report.useCatalog(catalogOf('8.1', [], true));
  standIn.report.skip(2, 3);
  standIn.report.record('a', 'started');
  standIn.report.summarize('active');
  assert.deepEqual(
    standIn.sink.lines.map((line) => line[0]),
    ['info', 'info'],
  );
  assert.equal(standIn.sink.lines[0]?.[2], 'Vivaldi 8.3 has no selector catalog of its own: using 8.1');

  const unknown = setup();
  unknown.report.useBuild({ vivarcdiVersion: '0.1.0', vivaldiVersion: 'unknown' });
  unknown.report.useCatalog(catalogOf('8.1', [], true));
  assert.equal(unknown.sink.lines[0]?.[2], 'Vivaldi unknown has no selector catalog of its own: using 8.1');

  const undefinedRun = setup();
  undefinedRun.report.useCatalog(catalogOf('8.1', ['missing']));
  undefinedRun.report.summarize('active');
  assert.equal(undefinedRun.sink.lines[0]?.[0], 'warn');
  assert.equal(undefinedRun.sink.lines[0]?.[2], 'selector "missing" is not defined in catalog 8.1');
});

test('boot notice needs two failures and the activation mark', () => {
  const attempt = (
    ids: Array<[string, ModuleOutcome]>,
    outcome: BootOutcome = 'active',
    withNotices = true,
  ): RecordingToast => {
    const toast = new RecordingToast();
    const report = new BootReport(new Logger('test:boot', new SilentSink()));
    for (const [id, result] of ids) {
      report.record(id, result);
    }
    report.notify(outcome, withNotices ? new Notices(toast) : null);
    return toast;
  };
  const severe: Array<[string, ModuleOutcome]> = [
    ['activation-marker', 'started'],
    ['a', 'failed'],
    ['b', 'failed'],
  ];
  assert.deepEqual(attempt(severe).shown, [{ text: bootNoticeText(2, 3), kind: 'error' }]);
  assert.equal(bootNoticeText(3, 15), 'VivArcDi could not start 3 of 15 features: details are in the console');
  assert.deepEqual(attempt(severe.slice(0, 2)).shown, []);
  assert.deepEqual(
    attempt([
      ['a', 'failed'],
      ['b', 'failed'],
    ]).shown,
    [],
  );
  assert.deepEqual(attempt([['activation-marker', 'started']]).shown, []);
  assert.deepEqual(attempt(severe, 'inactive').shown, []);
  assert.deepEqual(attempt(severe, 'failed').shown, []);
  assert.deepEqual(attempt(severe, 'active', false).shown, []);
});
