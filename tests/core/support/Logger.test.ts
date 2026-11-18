import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Logger } from '../../../src/core/support/Logger.js';
import { SilentSink } from '../../loader/fakes.js';

test('logger writes debug lines when the sink has them', () => {
  const sink = new SilentSink();
  new Logger('test', sink).debug('trace');
  assert.deepEqual(sink.lines, [['debug', '[test]', 'trace']]);
  const bare = { info: (): void => undefined, warn: (): void => undefined, error: (): void => undefined };
  assert.doesNotThrow(() => new Logger('test', bare).debug('dropped'));
});
