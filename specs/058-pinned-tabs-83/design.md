# 058 Pinned tabs on Vivaldi 8.3: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

Tore approved the spec on 2026-11-26 (PR #297): no `8.3.json` while 8.1 and 8.3 are compatible
(Q-1), a live scenario for AC-5 (Q-2), and no Vivaldi 8.1 or 8.2 to test by hand (Q-3). This document
says **how**; the spec says **what**.

## Approach

The behavior is mostly in place. [059](../059-pinned-tabs-arc/design.md) taught `TabBarMarker` to
read the slots of `pinnedGroup` beside the strip, and its test
`marks the separator after the last pinned row of a group beside the tab strip` already proves
AC-2. `PinnedMinus` finds its rows with a document-wide `pinnedTab` query, so it does not depend on
where the rows sit. What is missing is the proof: a test for each layout the spec names, a test that
the 8.1 catalog serves 8.3, and a live scenario on the lab Vivaldi 8.3.

The work therefore adds tests and one scenario. Production code changes only if one of the new tests
fails; the task that finds the failure fixes it in the file it names and keeps the change inside
`src/modules/pinned/`.

| Area | What changes | Where |
|---|---|---|
| Catalog on 8.3 | A test loads the real catalog for `8.3.4191.47` and compares its names with `8.1.json` | `tests/loader/SelectorCatalog.test.ts` |
| Minus in the group | A test puts the pinned rows inside a group node and presses the minus | `tests/modules/pinned/PinnedTabs.test.ts`, `tests/modules/pinned/fakes.ts` |
| Strip layout (8.1, 8.2) | A test marks the separator with the rows inside the strip and the catalog defining `pinnedGroup` | `tests/modules/pinned/Marking.test.ts` |
| Lab on 8.3 | A scenario shows a pinned row in the group, checks the separator, unloads from the minus and reopens | `tests/live/scenarios/the-separator-and-the-minus-work-on-the-pinned-group.live.ts` |
| Spec | AC-5 changes from `manual` to its `live:` name in the scenario's commit | `specs/058-pinned-tabs-83/spec.md` |

No module, no option, no selector and no stylesheet changes (NFR-2).

### The catalog test (AC-3)

`SelectorCatalog.load` takes a `PayloadSource`. The test gives it a loader that reads
`src/selectors/index.json` and the catalog files from disk, loads the catalog for `8.3.4191.47`, and
asserts that every key of `src/selectors/8.1.json` resolves with `has`. It also asserts
`standsInFor('8.3.4191.47')` while no `8.3.json` exists, so the boot's stand-in line stays true. When
a future `8.3.json` is added, the same test keeps proving that it drops no name of 8.1; the
stand-in assertion then reads the index and expects `false`.

```ts
test('defines on Vivaldi 8.3 every selector of the 8.1 catalog', async () => {
  const catalog = await SelectorCatalog.load(new DiskLoader('src'), '8.3.4191.47');
  const names = Object.keys(await readJson('src/selectors/8.1.json'));
  assert.deepEqual(names.filter((name) => !catalog.has(name)), []);
});
```

`DiskLoader` is a small fake next to `FakeLoader` in `tests/loader/fakes.ts`, reading with
`node:fs/promises`.

### The minus in the group (AC-4)

`MinusDocument` keeps its rows flat. A `addGroupRow(tabId)` helper, or a `group` flag on `addRow`,
wraps the row in a `MinusNode(['group'])` so the row's ancestors match the 8.3 markup:
group, then row, then wrapper with `data-id`, then header with the favicon. The test repeats the
assertions of `unloads a pinned tab from its minus` on that row: the press is swallowed, `discard`
runs for the tab id and `remove` never runs. `TabSlot.idOf` walks up from the button to the wrapper,
so the group above the row changes nothing; if it does, the fix goes in `PinnedMinus.#targetOf` or
in the fake, whichever misreads the markup.

### The strip layout (AC-7)

`Marking.test.ts` already builds rows inside a strip node with the `favorites/fakes.ts` catalog,
which defines `pinnedGroup`. The new test builds the strip with two pinned rows and one normal tab
and no group, applies the marker and asserts that only the second pinned row carries
`data-vivarcdi-pinned-last`, then that `clear` removes it. It differs from
`keeps marking the strip when the catalog has no pinned group` in that the catalog does define the
group, which is the case on 8.1 and 8.2 since 059.

### The live scenario (AC-5)

With the Favorites grid on, pinned tabs become tiles up to `maxTiles` (060), so the scenario reads
`maxTiles` from `src/config.json` and pins `maxTiles + 1` tabs to get one row in the group. The
pages are `about:blank#058-<n>` so the scenario needs no server.

1. Pin the tabs, wait for `.pinned-group .tab-position.is-pinned`, and navigate the last one to
   `about:blank#058-away`.
2. Assert that the last row of the group carries `[data-vivarcdi-pinned-last]`.
3. Click its `[data-vivarcdi-pinned-minus]` with `driver.click`, then wait for
   `chrome.tabs.get(id).discarded`.
4. Activate the tab and wait for its URL to equal its pinned page.
5. In `finally`, remove every tab the scenario opened.

The selectors come from `driver.selector('pinnedGroup')` and `driver.selector('pinnedTab')`, so the
scenario follows the catalog. The look of the row (favicon, dimmed state) stays in AC-6.

The 046 selector check runs in the same `npm run live` session and proves the rest of Q-1: no failed
selector on 8.3.

## Branch and version

If no task changes `src/`, the work goes on `test/058-vivaldi-83` with no version change, as
CONTRIBUTING allows for tooling and tests. If a task fixes code under `src/`, the branch is
`fix/058-vivaldi-83` with a patch bump in `package.json` and `installer/vivarcdi/__init__.py`, read
from `origin/main` right before the bump.

## Risks

| Risk | Mitigation |
|---|---|
| The lab profile runs with the grid off or another `maxTiles` | The scenario reads `maxTiles` from the payload config and, with the grid off, still finds a row; it fails with the count it saw |
| Vivaldi 8.3 takes a while to redraw the group after pinning | `driver.waitForElement` with the default timeout, as in the 061 scenario |
| The unload does not show in `discarded` at once | `driver.waitFor` on the expression, not one read |
| A future 8.3 build moves the rows again | The AC-3 test and the selector check fail first; a new spec adds `8.3.json` (Q-1) |
| No 8.1 or 8.2 to try by hand | AC-7 and the existing strip tests; the branch changes no strip code |
