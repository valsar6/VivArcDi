import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Logger } from '../../../src/core/Logger.js';
import type { LinkRequest } from '../../../src/modules/peek/LinkOpener.js';
import { PeekController } from '../../../src/modules/peek/PeekController.js';
import type { PanelHandle } from '../../../src/modules/peek/PeekController.js';
import { SilentSink } from '../../loader/fakes.js';

class FakePanel implements PanelHandle {
  public removed = false;

  constructor(public url: string) {}

  public remove(): void {
    this.removed = true;
  }
}

interface Setup {
  controller: PeekController;
  panels: FakePanel[];
  calls: unknown[][];
  changes: boolean[];
  sink: SilentSink;
}

function setUp({ panelFails = false, tileFails = false } = {}): Setup {
  const panels: FakePanel[] = [];
  const calls: unknown[][] = [];
  const changes: boolean[] = [];
  const sink = new SilentSink();
  const controller = new PeekController({
    createPanel: (request): FakePanel => {
      if (panelFails) {
        throw new Error('no webview');
      }
      const panel = new FakePanel(request.url);
      panels.push(panel);
      return panel;
    },
    opener: {
      openAfter: async (tabId, url): Promise<number> => {
        calls.push(['openAfter', tabId, url]);
        return 99;
      },
      openAsVivaldi: async (request): Promise<void> => {
        calls.push(['openAsVivaldi', request]);
      },
    },
    tiler: {
      tile: async (tabIds): Promise<void> => {
        calls.push(['tile', tabIds]);
        if (tileFails) {
          throw new Error('unknown tiling');
        }
      },
    },
    logger: new Logger('test', sink),
    onChange: (open): number => changes.push(open),
  });
  return { controller, panels, calls, changes, sink };
}

const request = (url: string): LinkRequest => ({ url, tabId: 7, disposition: 'new-window' });
const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

test('peek controller replaces an open peek', () => {
  const { controller, panels } = setUp();
  controller.open(request('https://a.example/'));
  controller.open(request('https://b.example/'));
  assert.equal(panels.length, 2);
  assert.equal(panels[0]?.removed, true);
  assert.equal(panels[1]?.removed, false);
  assert.ok(controller.isOpen);
});

test('peek falls back to the default action when the panel fails', async () => {
  const { controller, calls, sink } = setUp({ panelFails: true });
  controller.open(request('https://a.example/'));
  await settle();
  assert.equal(controller.isOpen, false);
  assert.deepEqual(calls, [['openAsVivaldi', request('https://a.example/')]]);
  assert.match(String(sink.lines[0]?.[2]), /Could not open Peek/);
});

test('peek controller closes and reports the change', () => {
  const { controller, panels, changes } = setUp();
  controller.open(request('https://a.example/'));
  controller.close();
  controller.close();
  assert.equal(panels[0]?.removed, true);
  assert.deepEqual(changes, [true, false]);
});

test('peek controller expands the page shown now into a tab after the source', async () => {
  const { controller, panels, calls } = setUp();
  controller.open(request('https://a.example/'));
  if (panels[0]) {
    panels[0].url = 'https://a.example/next';
  }
  assert.equal(await controller.expand(), 99);
  assert.equal(controller.isOpen, false);
  assert.deepEqual(calls, [['openAfter', 7, 'https://a.example/next']]);
  assert.equal(await controller.expand(), null);
});

test('peek controller splits by tiling the new tab with the source tab', async () => {
  const { controller, calls } = setUp();
  controller.open(request('https://a.example/'));
  await controller.split();
  assert.deepEqual(calls.at(-1), ['tile', [7, 99]]);
});

test('peek controller keeps the tab when tiling fails', async () => {
  const { controller, calls, sink } = setUp({ tileFails: true });
  controller.open(request('https://a.example/'));
  await controller.split();
  assert.equal(calls[0]?.[0], 'openAfter');
  assert.match(String(sink.lines[0]?.[2]), /Could not tile/);
});
