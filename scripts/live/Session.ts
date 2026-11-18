import type { ConsoleLog } from './ConsoleLog.js';
import type { Driver } from './Driver.js';
import type { CheckResult } from './Report.js';

export interface Session {
  driver: Driver;
  console: ConsoleLog;
}

export interface Check {
  run(session: Session): Promise<CheckResult[]>;
}
