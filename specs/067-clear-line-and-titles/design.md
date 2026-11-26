# 067 Clear line, its inset and centered titles: design

| | |
|---|---|
| Status | Approved (2026-11-26) |
| Spec | [spec.md](spec.md) |

Tore approved the spec on 2026-11-26 (PR #298) and accepted every proposal of Q-1 to Q-3. This
document says **how**; the spec says **what**. It keeps the Clear action of
[004](../004-today-tabs-and-keyboard/spec.md) and [060](../060-clear-bar-and-pinned-unload/spec.md)
and the separator rules of [050](../050-tab-strip-gap/spec.md), and changes only when the line and
Clear show, where they start and end, and how a Today title sits in its row.

## Approach

`ClearSeparator` already finds the first visible Today slot on every pass (`sync`,
`src/modules/today/ClearSeparator.ts:87-100`) and removes its own row when there is none. It is the
one place that knows "no Today tab" as the spec defines it (FR-3). The same pass now also publishes
that fact to the stylesheet, so no second watcher and no second count exists.

| Area | What changes | Where |
|---|---|---|
| Empty state | `sync` sets `data-vivarcdi-no-today` on the `browser` element while there is no Today slot, and removes it otherwise, on stop and when the strip is missing | `modules/today/ClearSeparator.ts`, `shared/tabs/TabBarMarks.ts` |
| Native line | The pinned-last line becomes an inset `::after`; the border, padding and margin it reserved are dropped while `data-vivarcdi-no-today` is set | `styles/pinned.scss`, `styles/sidebar-look.scss` |
| Clear inset | The Clear row takes `inset-inline: $folders-padding`; its line and button fill the row | `styles/today.scss` |
| Titles | `.tab-header` and `.title` of a row are centered in the 36 px row | `styles/sidebar-look.scss` |

### The empty-state mark

`TabBarMarks.ts` gets one more constant, next to the pinned-last and own-row marks:

```ts
export const NO_TODAY_ATTRIBUTE = 'data-vivarcdi-no-today';
```

`ClearSeparator` writes it to `this.#element('browser')`, the element it already watches and that
`$root` (`#browser[data-vivarcdi-active]`) selects. The browser element is the right carrier: both
the pinned-last slot and the Clear row are descendants, the CSS needs no new selector from the
catalog, and nothing is written to Vivaldi's tab strip.

```ts
#mark(empty: boolean): void {
  const browser = this.#element('browser');
  if (browser !== null && browser.hasAttribute(NO_TODAY_ATTRIBUTE) !== empty) {
    browser.toggleAttribute(NO_TODAY_ATTRIBUTE, empty);
  }
}
```

Rules:

- `sync` calls `#mark(true)` in the branch where `firstTodaySlot` returns null, next to
  `this.#row.remove()`. It calls `#mark(false)` as soon as a slot is found, before `#place`, so a
  slot whose offset is not yet readable still counts as a Today tab and the line does not flicker.
- When the strip is missing, `sync` calls `#mark(false)`: with no strip VivArcDi does not know, so
  it hides nothing.
- `stop()` calls `#mark(false)`.
- The write is guarded by `hasAttribute`, so a pass with no change writes nothing. The watcher
  watches `hidden`, `data-vivarcdi-pinned-last` and `style`, not this attribute, so it cannot loop.
- Cost stays one pass per animation frame through the existing `FrameTask` (NFR-2). No module,
  option, listener or dependency is added (NFR-1). FR-2 holds within one frame because the existing
  watcher already re-runs `sync` when slots appear, hide or change their offsets.
- `firstTodaySlot` and `#isToday` are not changed. Before writing the AC-4 test the implementer
  reads them against the fakes and states in the test how a slot hidden by a folder and a linked
  slot are built so that neither counts. If one of them does count today, that is a gap against
  FR-3: report it, do not widen the scope silently.

The existing `#line()` is unchanged: with no Today slot `sync` returns before it, so no
`data-vivarcdi-clear-line` mark stays (AC-1).

### The native line, its inset and the empty state

Today `pinned.scss:3-8` puts `margin-bottom`, `padding-bottom` and a `1px` `border-bottom` on
`[data-vivarcdi-pinned-last]`, and `sidebar-look.scss:202-204` sets a second `border-bottom` on the
same mark. A border cannot be inset, so the line is drawn by a pseudo-element and the borders go:

```scss
#{$root} #{$pinned-last} {
  margin-bottom: $separator-gap;
  padding-bottom: $separator-gap;

  &::after {
    content: '';
    position: absolute;
    inset-inline: $folders-padding;
    bottom: 0;
    height: 0;
    border-top: 1px solid var(--vivarcdi-line, color-mix(in srgb, var(--colorFg, #fff) #{$separator-tint}, transparent));
    pointer-events: none;
  }
}

#{$root}[data-vivarcdi-no-today] #{$pinned-last} {
  margin-bottom: 0;
  padding-bottom: 0;

  &::after {
    display: none;
  }
}
```

- `pinned.scss` owns the geometry and the line; the `border-bottom` rule of `sidebar-look.scss` is
  removed. `--vivarcdi-line` (defined by `sidebar-look`) is the colour, with the old colour of
  `pinned.scss` as fallback when that look is off (FR-5, AC-6).
- `position: relative` is added to the mark only if the slot is not already positioned: Vivaldi
  places `.tab-position` slots absolutely, and the probe below decides.
- The line uses `inset-inline: $folders-padding`, so it ends where the rows end, the inset of the
  New Tab row (`sidebar-look.scss:206-213`).
- While `data-vivarcdi-no-today` is set the line, the padding and the margin are gone (FR-1, AC-2).
  Pinned tiles, folders and pinned rows keep their own rules; only the pinned-last mark is touched.
- The empty-state selector has higher specificity than the base rule on purpose and needs no
  `!important`.

**Probe first.** The spec flags that the line that stays today is "most likely" the pinned-last
border. The implementer confirms it before writing the CSS with `npm run live -- --probe <file>`
(needs Tore's agreement) on a lab Vivaldi 8.3 with no Today tab and one pinned tab. The probe reads,
for every element under the tab strip and the folders, the computed border widths, `padding-bottom`
and `margin-bottom`, and prints which element draws a 1 px line and its rect. If another element
draws it (for example Vivaldi's own separator), the implementer reports it and the hide rule moves
to that element; the attribute and the tests of AC-1, AC-3 and AC-4 do not change. The same probe
records the rects of a Today title and of its row for the centering below.

### The Clear row, its line and its button

`today.scss` (`:142-190`) puts the row, its `::before` line and the button on `inset-inline: 0`.
The inset moves to the row, so the three share it and Clear stays at the right end of the line:

```scss
#{$root} #{$clear-row} {
  inset-inline: $folders-padding;
}
```

The `::before` line and the button keep `inset-inline: 0` and the button keeps
`justify-content: flex-end`; their parent now sits 6 px inside the strip on both sides, so line and
Clear start and end where the rows do (FR-4, AC-5). The button keeps `padding: 0 $gap`. Nothing
else in the row changes: its `--PositionY`, height 0 and `pointer-events` stay, so 060's box rules
hold.

### Centered titles

`sidebar-look.scss` gives the rows a fixed `height: $row-height` (`:60-68`) and `.title` only
colour, size and weight (`:84-88`). The centering is added to the row's header and title:

```scss
#{$rows} .tab-header {
  display: flex;
  align-items: center;
  height: 100%;
}

#{$rows} .title {
  align-self: center;
  line-height: normal;
}
```

The probe confirms the exact declarations. The target is
`abs((title.top + title.height / 2) - (row.top + row.height / 2)) <= 1` for a Today row of 36 px
(FR-6, AC-7). If Vivaldi's `.tab-header` already is a flex row, `height: 100%` and `align-self` may
be the only needed lines; the implementer keeps the smallest set that passes the probe and does not
touch the `.close` and favicon rules, which spec 066 owns. If the final declarations differ from
the block above, the AC-7 test asserts the final ones. Pinned rows share `$rows`, so they are
centered too, as in Arc.

### 060's live scenario

`the Clear bar keeps a box above Today with the Favorites grid on`
(`tests/live/scenarios/the-clear-bar-keeps-a-box-above-today.live.ts`) opens one pinned tab and two
Today tabs before it measures. The workspace has Today tabs, so `data-vivarcdi-no-today` is not set
and its assertions hold: the Clear control has a non-zero box, sits outside the hidden pinned
group, ends above the first Today slot and receives the press. The 6 px row inset changes
`clear.left` and `clear.width` only, and the scenario asserts neither. **The body does not
change.**

The amended 060/FR-1 (no Clear while there is no Today tab) is not covered by it. The spec leaves a
`live:` check for later and AC-8 stays manual. A later scenario would carry `spec: '067'`, close
every Today tab and assert that the Clear control and the line have no box and that the pinned-last
slot has no border or margin. The docs task marks 060/FR-1 as amended by 067.

## Files

| File | Role |
|---|---|
| `src/shared/tabs/TabBarMarks.ts` | `NO_TODAY_ATTRIBUTE` |
| `src/modules/today/ClearSeparator.ts` | Writes and clears the mark in `sync` and `stop` |
| `src/styles/pinned.scss` | Inset `::after` line, empty-state hide |
| `src/styles/sidebar-look.scss` | Drops the second pinned-last border; centers `.tab-header` and `.title` |
| `src/styles/today.scss` | Clear row inset |
| `tests/modules/today/ClearSeparator.test.ts` | AC-1, AC-3, AC-4 |
| `tests/styles/Pinned.test.ts` | AC-2, AC-6 |
| `tests/styles/Today.test.ts` | AC-5 |
| `tests/styles/SidebarLook.test.ts` | AC-7; keeps the border assertions, if any, in line with the removal |
| `specs/060-clear-bar-and-pinned-unload/spec.md`, `specs/004-today-tabs-and-keyboard/spec.md`, `specs/028-arc-sidebar-look/spec.md` | Notes "amended by 067" |
| `docs/manual/tab-bar.md`, `README.md` | Wording of the empty state, if they name the line |
| `package.json`, `package-lock.json`, `installer/vivarcdi/__init__.py` | Patch version bump |

## Tests

Style tests compile the stylesheet with `sass` and match the CSS text, as `tests/styles/Pinned.test.ts`
does. Module tests use the fakes of `tests/modules/today/ClearSeparator.test.ts` (`StripChild`,
`setUp`, `todaySlot`); the fake document must return a `browser` element that supports
`hasAttribute` and `toggleAttribute`, which `StripChild` already does.

| AC | Test name (verbatim) | File | What it asserts |
|---|---|---|---|
| AC-1 | `hides the Clear line while there is no Today tab` | `tests/modules/today/ClearSeparator.test.ts` | With no Today slot there is no Clear row in the strip and no line mark; the browser element has `data-vivarcdi-no-today`; after `stop()` the mark is gone |
| AC-2 | `hides the pinned-last border while there is no Today tab` | `tests/styles/Pinned.test.ts` | A rule on `[data-vivarcdi-no-today]` plus the pinned-last mark sets `margin-bottom: 0` and `padding-bottom: 0` and hides the `::after`; no `border-bottom` stays on the mark in `pinned.scss` or `sidebar-look.scss` |
| AC-3 | `shows the Clear line when a Today tab opens` | `tests/modules/today/ClearSeparator.test.ts` | Starting empty, adding a Today slot and firing the watcher yields the Clear row, the line mark (no visible pinned-last) and no `data-vivarcdi-no-today`; removing the slot brings the empty state back |
| AC-4 | `ignores hidden and linked tabs for the Clear line` | `tests/modules/today/ClearSeparator.test.ts` | With only a slot hidden by a folder and a linked slot, no row exists and the mark is set |
| AC-5 | `insets the Clear line like the rows` | `tests/styles/Today.test.ts` | The Clear row has `inset-inline: 6px`; its `::before` and the button have `inset-inline: 0`; the button keeps `justify-content: flex-end` |
| AC-6 | `insets the pinned-last border like the rows` | `tests/styles/Pinned.test.ts` | The pinned-last `::after` has `inset-inline: 6px` and a `1px` `border-top`, and no `border-bottom` stays on the mark |
| AC-7 | `centers the Today title in its row` | `tests/styles/SidebarLook.test.ts` | The `.tab-header` rule of the rows has `display: flex`, `align-items: center` and `height: 100%`; the `.title` rule has `align-self: center` |
| AC-8 | manual | Tore | See the tasks |

The geometry (within 1 px) cannot be proved from CSS text. The implementer records the probe numbers
in the pull request, and AC-8 covers them until a `live:` check exists.

## Risks

| Risk | Answer |
|---|---|
| The remaining line comes from another element | The probe comes first; the hide rule follows the element it finds |
| A pass flickers the line while the offset is unreadable | `#mark(false)` runs once a slot is found, before `#place` |
| The attribute loops the watcher | The watched list does not include it and the write is guarded |
| Dropping the border loses the line when `sidebar-look` is off | `pinned.scss` draws the `::after` with the old colour as fallback |
| The inset `::after` is clipped by the slot | The probe checks it; the line sits at `bottom: 0` with `pointer-events: none` |
| Centering moves the favicon or the close control | Only `.tab-header` alignment and `.title` change; 066's `.close` rules stay |
| Old tests assert the border on the pinned-last mark | The style tasks update them in the same task |

## Version

Branch `fix/067-clear-line-and-titles` with a patch bump (visible fix, no new option), read from
`origin/main` right before the docs task.
