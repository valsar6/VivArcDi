import { Logger } from '../../src/core/support/Logger.js';
import type { BrowserRuntime } from '../../src/core/browser/BrowserRuntime.js';
import { Module } from '../../src/core/boot/Module.js';
import type { ModuleContext, PrivateWindowPolicy } from '../../src/core/boot/Module.js';
import { Option } from '../../src/core/boot/options/Option.js';
import { OptionSchema } from '../../src/core/boot/options/OptionSchema.js';
import type { OptionValues } from '../../src/core/boot/options/OptionSchema.js';
import { ModuleRegistry } from '../../src/core/boot/ModuleRegistry.js';
import type { ModuleOptions } from '../../src/core/boot/types.js';
import { VivArcDi } from '../../src/core/boot/VivArcDi.js';
import { registerReactProbe } from '../../src/shared/spaces/ReactProbe.js';
import { ActivationMarker } from '../../src/modules/ActivationMarker.js';
import type { SaveOutcome, SavingStorage, StorageMode } from '../../src/core/browser/SavingStorage.js';
import { FakeDocument, FakeElement, FakeLoader, SilentSink } from './fakes.js';

export class Broken extends Module {
  public static override id = 'broken';

  public override start(): void {
    throw new Error('boom');
  }
}

export class AlsoBroken extends Module {
  public static override id = 'also-broken';

  public override start(): void {
    throw new Error('boom');
  }
}

export class BrokenMarker extends Module {
  public static override id = 'activation-marker';

  public override start(): void {
    throw new Error('boom');
  }
}

export class Hidden extends Module {
  public static override id = 'hidden';

  public override start(): void {}
}

export class Private extends Module {
  public static override id = 'private';
  public static override privateWindows: PrivateWindowPolicy = 'only';

  public override start(): void {}
}

const CONFIGURED_OPTIONS = OptionSchema.of({
  clientId: Option.requiredText({ nonEmpty: true }),
  size: Option.number(3, { min: 1, max: 9 }),
});

export const seen: Array<ModuleContext<object>> = [];

export class Configured extends Module<OptionValues<typeof CONFIGURED_OPTIONS>> {
  public static override id = 'configured';
  public static override options = CONFIGURED_OPTIONS;

  public override start(context: ModuleContext<OptionValues<typeof CONFIGURED_OPTIONS>>): void {
    seen.push(context);
  }
}

export class Follower extends Module {
  public static override id = 'follower';

  public override start(context: ModuleContext): void {
    seen.push(context);
  }
}

export const runtimeAnswering = (answer: () => Promise<boolean>): BrowserRuntime => ({ isPrivateWindow: answer }) as unknown as BrowserRuntime;

export const savingStorage = (mode: StorageMode): SavingStorage => ({
  mode,
  getItem: () => null,
  setItem: () => undefined,
  save: async (): Promise<SaveOutcome> => (mode === 'memory' ? 'memory' : 'saved'),
});

export interface AppOptions {
  storage?: SavingStorage;
  runtime?: BrowserRuntime;
  vivaldiVersion?: string;
  modules?: Record<string, ModuleOptions>;
  missing?: string[];
  browser?: boolean;
  marker?: typeof Module;
}

function payloadFiles(vivaldiVersion: string, modules: Record<string, ModuleOptions> | undefined, missing: string[]): Record<string, unknown> {
  const files: Record<string, unknown> = {
    'config.json': {
      styles: ['styles/base.css'],
      modules: modules ?? { 'activation-marker': { enabled: true } },
    },
    'build.json': { vivarcdiVersion: '0.1.0', vivaldiVersion },
    'selectors/index.json': { versions: ['8.1'] },
    'selectors/8.1.json': { browser: '#browser' },
  };
  missing.forEach((path) => delete files[path]);
  return files;
}

function documentOf(hasBrowser: boolean): { browser: FakeElement; document: FakeDocument } {
  const browser = new FakeElement();
  return { browser, document: new FakeDocument(hasBrowser ? { '#browser': browser } : {}) };
}

export function createApp({
  vivaldiVersion = '8.1.3740.12',
  modules,
  runtime,
  storage = savingStorage('persistent'),
  missing = [],
  browser: hasBrowser = true,
  marker = ActivationMarker,
}: AppOptions = {}): {
  app: VivArcDi;
  browser: FakeElement;
  document: FakeDocument;
  sink: SilentSink;
} {
  const { browser, document } = documentOf(hasBrowser);
  const sink = new SilentSink();
  const loader = new FakeLoader(payloadFiles(vivaldiVersion, modules, missing));
  const registry = new ModuleRegistry().register(marker).register(Broken).register(AlsoBroken).register(Hidden).register(Private).register(Configured).register(Follower).register(Asker).register(ReactUser).register(ProbeRecorder);
  const app = new VivArcDi({
    loader,
    registry,
    logger: new Logger('test', sink),
    document: document as unknown as Document,
    storage,
    ...(runtime === undefined ? {} : { runtime }),
  });
  return { app, browser, document, sink };
}

export class Asker extends Module {
  public static override id = 'asker';

  public override start(context: ModuleContext): void {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        context.selectors.get('missing');
      } catch {
        continue;
      }
    }
  }
}

export const linesOf = (sink: SilentSink, tag: string): unknown[][] => sink.lines.filter(([, line]) => line === tag);

export const summaryOf = (sink: SilentSink): { level: string; text: string } | undefined => {
  const line = linesOf(sink, '[test:boot]').find(([, , text]) => String(text).startsWith('self-check:'));
  return line === undefined ? undefined : { level: String(line[0]), text: line.slice(2).join(' ') };
};

export class ReactUser extends Module {
  public static override id = 'react-user';

  public override start(context: ModuleContext): void {
    registerReactProbe(context);
  }
}

export const events: string[] = [];

export class ProbeRecorder extends Module {
  public static override id = 'probe-recorder';

  public override start(context: ModuleContext): void {
    events.push('start');
    const probe = {
      name: 'recorded',
      expects: 'nothing',
      holds: (): boolean => {
        events.push('probe');
        return true;
      },
    };
    context.shape.add(probe);
    context.shape.add(probe);
  }
}
