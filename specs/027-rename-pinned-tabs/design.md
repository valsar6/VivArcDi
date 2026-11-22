# 027 Rename and re-icon pinned tabs: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

Rewritten after the revision of the spec was approved on 2026-11-22 (pull request #249). The first design
(2026-11-09) cited `src/core/PinnedLabel.ts`, `src/modules/pinned/` and a fixed grid of 60 emoji; none of
that exists any more and the revision asks for something else. It says **how**; the spec says **what**. It
builds on the menu of a saved row of [056](../056-saved-tab-menu/design.md), the menu of a tile of
[057](../057-tile-menu/design.md), the stored formats of [037](../037-versioned-storage/spec.md) and the
folder icon of [033](../033-folder-menu/spec.md), which reuses the picker.

## Approach

### Today (verified in the code, `origin/main` 1ec2eca)

| Fact | Where |
|---|---|
| No code stores a name or an icon for a bookmark; `LinkExtras.copy` is a no-op waiting for this spec | `src/modules/folders/editing/LinkExtras.ts` 1-14 |
| The menu of a saved row is `LinkMenuItems`; group 2 is only `Edit Pinned Page`; the slots come from `SavedTabActions.create` | `src/modules/folders/editing/LinkMenuItems.ts` 3-12, 39-48; `SavedTabActions.ts` 45-52 |
| The menu of a tile is `TileMenu`: `Untile tab`, `Pin tab`, then the web panel item; 057 (not implemented) puts the link groups before them | `src/modules/favorites/TileMenu.ts` 60-79; `specs/057-tile-menu/design.md` |
| A link row gets its title in `FolderRows.#link` (the title of the open tab when it navigated elsewhere, else the bookmark title) and its icon in `FolderRowElement.#fillLink` through `LinkIcon.create` (an `img`) | `src/modules/folders/view/FolderRows.ts` 85-89; `FolderRowElement.ts` 58-67; `src/shared/links/LinkIcon.ts` 17-24 |
| A tile is icon-only: a letter and an `img`; the title is only the tooltip (`tile.title`) | `src/modules/favorites/FavoritesView.ts` 114-127 |
| Tiles of the grid come from bookmarks (`BookmarkFavorites`, which has no storage) or, as a fallback, from pinned tabs (`PinnedFavorites`, no bookmark id) | `src/modules/favorites/BookmarkFavorites.ts` 138-147; `PinnedFavorites.ts` 150 |
| The window storage is a `VersionedStorage`; a store reads with `storage.read(key, format)` and writes with `save`, which returns `saved`, `failed` or `memory` | `src/core/boot/Module.ts` 46-47; `src/core/browser/StoredFormat.ts`; `SavingStorage.ts` |
| A store that changes between windows reads on every call (`LiveFolderStore`) and `LastOpenedStore` shows the pattern of a `StoredFormat` with a bare version 1 | `src/shared/links/LastOpenedStore.ts` 8-19 |
| `BookmarkNode` has `id`, `parentId`, `index`, `title`, `description`, `url`, `children`; no `vivExtData` and no `guid` | `src/core/browser/bookmarks/BookmarkNode.ts` |
| `BookmarkWriter.update` takes `{ title }` and `BookmarkChanges` has `title`, `description`, `url` | `src/core/browser/bookmarks/BookmarkWriter.ts` 14-18, 80-82 |
| `FolderNameEditor` is the in-place field of folder rows: tied to folders and to `FolderSectionView.render`; rows are redrawn with `replaceChildren` | `src/modules/folders/editing/FolderNameEditor.ts`; `view/FolderSectionView.ts` 87-101 |
| Static payload files are every `.json` under `src/`, copied to `dist/` with the same path and read through `context.payload.json(path)` | `scripts/build.mjs` 153-171; `src/core/boot/ResourceLoader.ts` 41-43 |
| `max-lines` is 200 per file and `max-lines-per-function` 40 for `src/`; the boundary tests refuse a shared file used by fewer than two modules and a core file used by fewer than two modules and by no core file | `eslint.config.mjs` 12-15; `tests/structure/ModuleBoundaries.test.ts` 81-116 |

### Where the pieces live

Both modules, `folders` (saved rows) and `favorites` (tiles), need the same five things, so each is a
legitimate file of `src/shared/` or `src/core/` (spec 034: used by two modules):

| Piece | Home | Used by |
|---|---|---|
| The label store `LinkLabels` | `src/core/browser/LinkLabels.ts` | `FolderSection`, `BookmarkFavorites` (T2) |
| The label icon `LabelIcon` and the 24 symbols `IconSymbols` | `src/shared/icons/` | `FolderRowElement`, `FavoritesView` (T2), then the picker |
| The emoji data and search `EmojiCatalog`, with `src/shared/emoji/emoji.json` | `src/shared/emoji/` | the picker (T3) |
| The in-place editor `InPlaceEditor` | `src/shared/links/InPlaceEditor.ts` | `LabelCommands` (T4) |
| The picker `IconPicker` | `src/shared/icons/IconPicker.ts` | `LabelCommands` (T5), and 033 for folders |
| The two menu items `LabelCommands` | `src/shared/links/LabelCommands.ts` | `SavedTabActions` and `TileLinkCommands` (T6) |

Until T6 wires them into the two modules, the files of T3, T4 and T5 are used by no module and the two
tests `every shared file is used by two modules` and `every core file is used by core or by two modules`
list them. T2 is green on its own because both modules import its files. The tasks that wait for T6
(see [tasks.md](tasks.md)) are merged into one feature branch, which goes to `main` after T6, so `main`
never sees the red state.

### Storage: plan A and plan B (Q-2, FR-1)

| Plan | Where the name and icon live | Sync | Chosen when |
|---|---|---|---|
| A | A field of the bookmark node itself (`vivExtData` or another field Vivaldi carries), written through `BookmarkWriter` | Vivaldi Sync carries it with the bookmark | T1 shows that the API accepts and returns the field, Vivaldi's panel does not show it, and Tore's two computers show it (manual) |
| B | `vivarcdi.labels` in the window storage, a `StoredFormat` version 1 of `{ [bookmarkId]: LinkLabel }` | Local to the computer: bookmark ids differ between computers, so Vivaldi Sync cannot carry it by itself; task T7 sends it through the sync store of 030, keyed by address key | A is not proven |

**Plan B is the default.** The extension API of `chrome.bookmarks.update` ignores unknown members, the
node has no `vivExtData` in the code (`BookmarkNode.ts`), and the lab profile cannot prove a sync. The
public interface of `LinkLabels` below is the same in both plans; only the inside of its read and
write changes, so the other tasks do not wait for T1. T2 starts after T1 and writes the plan T1
confirms; if T1 confirms A, the lead amends this section first.

**The probe (T1).** Run by the lead with `npm run live -- --probe <file>`, only after Tore agrees.
`ProbeGuard` rejects `chrome.bookmarks.update` and `create` in a probe (spec 046), and the lab profile
has no bookmarks, so the probe can only read, and it can answer only these:

| # | Question | How | What it settles |
|---|---|---|---|
| F-1 | Which methods the bookmarks APIs have | `Object.keys` of `chrome.bookmarks` and of `vivaldi.bookmarksPrivate` | Whether a method that sets Vivaldi-specific fields exists (`vivExtData`, `nickname`) |
| F-2 | Which members a node has | `chrome.bookmarks.getTree` and `get` of the permanent folders and the Trash: the union of the own property names of every node | Which Vivaldi members exist at all (`description`, `nickname`, `themeColor`, `guid`, `vivExtData`) |
| F-3 | Whether the bookmark id is stable between runs | Two probes of the same profile: the ids of the permanent folders | That an id is a good key on one computer |

What the probe cannot prove, and who proves it:

| Open point | Proof |
|---|---|
| A write of a candidate field round-trips (`update`, then `get`) | A temporary scenario run by the lead on the throwaway profile (writes are allowed in scenarios, as `savedTab.ts` creates bookmarks), not committed, only if F-1 or F-2 shows a candidate |
| Vivaldi's panel does not show the field, Vivaldi Sync carries it | Tore, on his two computers: not a lab check. Until he does, plan B stands |
| A bookmark id is not the same on two computers | Known from Chromium: ids are local, sync matches by a GUID the extension API does not expose (F-2 confirms the absence) |

The lead writes the findings into a table under this heading before T2 starts, as 056 did.

### Display (FR-2, FR-8)

- **Rows.** `RowSources` gains `labels: (id: string) => LinkLabel | undefined`. `FolderRows.#link` uses
  `label.name` instead of the title (it also wins over the title of an open tab that navigated away) and
  `LinkRow` gains `icon?: LabelIcon`. `FolderRowElement.#fillLink` draws `LabelIcon.create(...)` when the
  row has an icon, else `LinkIcon.create` as today. `FolderSection.#draw` builds the sources with one
  `labels.all()` per draw and redraws on `labels.onChange`.
- **Tiles.** `Favorite` gains `name?` and `icon?`; `BookmarkFavorites.#receive` maps the favorites through
  `labels.all()` (the title becomes the name, so the tooltip shows it) before `view.show`, keeps the last
  list and shows it again on `labels.onChange`. `FavoritesView.#tileOf` draws the icon with `LabelIcon`
  instead of the letter and the `img`. Tiles are the same in every workspace because the bookmark is
  (AC-10). Tiles that come from pinned tabs (`PinnedFavorites`) have no bookmark: no label, and no items
  in their menu.
- A reset removes the entry, so the next draw is the one of today (AC-3).

## The label store (T2)

```ts
export type LabelIcon = { emoji: string } | { symbol: string };

export interface LinkLabel {
  /** The short name; absent shows the page title. */
  name?: string;
  /** The emoji or symbol; absent shows the favicon. */
  icon?: LabelIcon;
}

export interface LabelChange {
  /** A text sets the name, null removes it. */
  name?: string | null;
  icon?: LabelIcon | null;
}

export class LinkLabels {
  /** One instance for each window storage, so the two modules see each other's changes. */
  static of(storage: VersionedStorage, logger: Logger): LinkLabels;
  get(id: string): LinkLabel | undefined;
  all(): ReadonlyMap<string, LinkLabel>;
  set(id: string, change: LabelChange): Promise<SaveOutcome>;
  clear(id: string): Promise<SaveOutcome>;
  copy(fromId: string, toId: string): Promise<void>;
  onChange(listener: () => void): () => void;
}
```

- Key `vivarcdi.labels`, `StoredFormat<Record<string, LinkLabel>>` at version 1 (bare JSON, as
  `LastOpenedStore`); `read` rejects the shape as a whole when the value is not an object and skips an
  entry whose `name` is not a string or whose `icon` has neither `emoji` nor `symbol` as a non-empty
  string (`skipped: true`). A `newer` value is read-only through the guard of 037. The key is added to
  `readEveryStore` and to the `expected` list of `tests/structure/StoredKeys.test.ts`, whose test name does
  not change.
- `set` reads the current map, applies the change, drops an entry left with no name and no icon,
  notifies the listeners at once (the screen follows the memory, as `PersistentStorage` does) and returns
  `storage.save(KEY, FORMAT.encode(map))`; it never throws. `clear(id)` is `set` with both fields null.
- `of` keeps a `WeakMap<VersionedStorage, LinkLabels>`; the listeners live in the instance, so a change
  made through the folders module redraws the tiles of the favorites module.
- `copy(fromId, toId)` copies the entry; it fills the hook of 056: `LinkExtras.copy` calls it (T6).
- Nothing in `LinkLabels` takes a `BookmarkWriter`: a name or an icon cannot change a URL or a title
  (FR-3, AC-4). Logger child `labels`: `warn` `labels are kept for this session only` once, when `save`
  gives `failed`.
- Orphan entries (the bookmark was deleted) stay in the value; ids are never reused in Chromium, so they
  are only a few bytes each. A later cleanup may prune them.

**Icons.** `LabelIcon.create(document, icon, className): HTMLElement` returns a `span` with the emoji as
text, or a `span` with an inline `svg` (`createElementNS`, `viewBox="0 0 24 24"`, `fill="none"`,
`stroke="currentColor"`, `stroke-width="1.8"`, round caps, one `path` of the symbol) so it takes the color
of the row. `IconSymbols.all(): readonly IconSymbol[]` (`{ id, label, path }`) are the 24 line symbols of
033 FR-9; the ids are stored, so they are fixed here: `star`, `bookmark`, `heart`, `bolt`, `triangle`,
`gear`, `bell`, `pin`, `chat`, `people`, `plane`, `ball`, `moon`, `globe`, `music`, `camera`, `code`,
`smile` (the 18 the recording and 033 name) and `home`, `book`, `mail`, `cloud`, `flag`, `key` (the six
033 leaves to "…"). `IconSymbols.byId(id)` returns one or undefined; a stored id that is unknown draws
the favicon.

## The in-place editor (T4, FR-5, FR-7)

`InPlaceEditor` in `src/shared/links/`, a small floating field, not part of the rows, so a redraw of the
rows (`replaceChildren`) does not remove it:

```ts
export interface EditTarget {
  /** The element the field covers (the title of a row) or sits under (a tile). */
  anchor: HTMLElement;
  /** True over the title of a row, false under an icon-only tile. */
  covers: boolean;
}

export class InPlaceEditor {
  constructor(deps: { document: Document; parent: () => Element });
  /** Resolves the trimmed text on Enter or a click elsewhere, null on Escape; an empty text resolves ''. */
  edit(options: { target: EditTarget; value: string; label: string }): Promise<string | null>;
  /** Puts the field back on its anchor after the rows were drawn again. */
  reposition(): void;
  cancel(): void;
}
```

- `position: fixed` in `#browser`, same rectangle as the title of the row (`covers`) with the font and
  background of the row, or 160 px wide below the tile; `-webkit-app-region: no-drag` like
  `FolderNameEditor`; the field is focused with the text selected; keydown stops propagation so
  Vivaldi's shortcuts do not run while typing.
- Enter and blur finish with the text (blur saves, as the folder editor does); Escape and `cancel()`
  resolve `null`; only one field is open, a second `edit` cancels the first. The wiring calls
  `reposition()` after `FolderSectionView.render` and after `FavoritesView.show`.
- A tile shows no text, so its field sits under the icon with the current name or title; the name then
  shows as the tooltip (the title of a tile is a tooltip today).
- Styles: `src/styles/inline-editor.scss`, `styles/inline-editor.css` in `src/config.json`, the
  attribute `data-vivarcdi-inline-editor`.
- `FolderNameEditor` is not touched; 033 may adopt `InPlaceEditor` later.

## The picker (T3 and T5, FR-6, FR-7, Q-3, Q-4)

**Emoji data (T3).** `src/shared/emoji/emoji.json`, loaded the first time the picker opens with
`context.payload.json('shared/emoji/emoji.json')` (the file is copied by the build like the selector
catalogs, `scripts/build.mjs` 167), so the payload that starts with Vivaldi does not carry 1,400 emoji:

```json
{ "unicode": "15.1", "categories": [
  { "id": "faces", "label": "Faces", "emoji": [ { "e": "<the character>", "n": "grinning face", "k": ["smile", "happy"] } ] } ] }
```

The categories, in this order, are the eight of the recording: `faces`, `nature`, `food`, `activities`,
`travel`, `objects`, `symbols`, `flags`. The list is the base emoji of Unicode 15.1 without skin-tone
and ZWJ variants, with the CLDR English name and up to four keywords each. The implementer produces the
file once from a published emoji dataset with a one-off command that is not added to the repository and
no dependency is added; the header of the pull request names the source and its license.
`EmojiCatalog`:

```ts
export interface EmojiEntry { emoji: string; name: string; keywords: string[]; category: string }
export interface EmojiCategory { id: string; label: string; emoji: EmojiEntry[] }

export class EmojiCatalog {
  static load(payload: Pick<PayloadSource, 'json'>, logger: Logger): Promise<EmojiCatalog>;
  categories(): readonly EmojiCategory[];
  /** Entries whose name or a keyword contains every word of the text, case-insensitive, in file order; '' gives none. */
  search(text: string): EmojiEntry[];
}
```

A file that cannot be read gives an empty catalog and one `warn`; the picker then shows `Emoji are not
available` in its emoji tab and the `Icons` tab still works.

**`IconPicker` (T5)** in `src/shared/icons/`, a popover beside the anchor, kept generic for 033:

```ts
export type PickerTab = 'emoji' | 'icons';
export type PickResult = { icon: LabelIcon } | { reset: true };

export interface PickerCatalog {
  categories(): readonly { id: string; label: string; emoji: readonly { emoji: string; name: string }[] }[];
  search(text: string): readonly { emoji: string; name: string }[];
}

export class IconPicker {
  constructor(deps: { document: Document; parent: () => Element; catalog: () => Promise<PickerCatalog>; symbols: readonly { id: string; label: string; path: string }[] });
  /** Resolves the choice, or null on Escape or a click elsewhere. */
  pick(options: { anchor: HTMLElement; tabs?: readonly PickerTab[] }): Promise<PickResult | null>;
  close(): void;
}
```

The picker declares the structural types it needs, so T5 does not import the files of T2 or T3 and
the three tasks run in parallel; `EmojiCatalog` and `IconSymbols` satisfy them.

- Layout as in the recording: the tabs `Emoji` and `Icons` on top and a reset button (trash icon,
  `aria-label` `Reset`) at their right; the `Emoji` tab has a search field (`placeholder` `Search`,
  focused when the popover opens), a scrolling grid of buttons and the eight category buttons at the
  bottom (`aria-label` the category label), which scroll the grid to the category. Typing replaces the
  grid with `search(text)`; clearing the field brings the categories back. The `Icons` tab is the 24
  symbols in a grid of six by four, each a button with the label as `aria-label`. `tabs` default to both;
  033 asks for `['icons']` or both.
- A click on an emoji or a symbol resolves `{ icon }` and closes; the reset button resolves `{ reset: true
  }`; Escape, a pointer down outside and `close()` resolve `null`; a second `pick` closes the first.
  The popover is placed to the right of the anchor, to the left when there is no room, clamped to
  the window (`ContextMenu` has the same rule for its submenus); `-webkit-app-region: no-drag`.
- Attributes for tests and styles: `data-vivarcdi-picker`, `data-vivarcdi-picker-tab` (`emoji`, `icons`),
  `data-vivarcdi-picker-search`, `data-vivarcdi-picker-cell`, `data-vivarcdi-picker-category`,
  `data-vivarcdi-picker-reset`. Styles `src/styles/icon-picker.scss`, `styles/icon-picker.css` in
  `config.json`, the tokens in `_tokens.scss`.
- 1,400 buttons are drawn once, on first open; a later open reuses them.

## The two menu items (T6, FR-4, FR-5, FR-6)

**`LabelCommands`** in `src/shared/links/`:

```ts
export interface LabelCommandsDependencies {
  labels: Pick<LinkLabels, 'get' | 'set' | 'clear'>;
  editor: Pick<InPlaceEditor, 'edit'>;
  picker: Pick<IconPicker, 'pick'>;
  /** Where the id is drawn, or null when it is not on screen. */
  target: (id: string) => EditTarget | null;
  /** The text the field starts with: the name, else the title the row or tile shows. */
  textOf: (id: string) => string;
  notify: (text: string, kind?: ToastKind) => void;
  logger: Logger;
}

export class LabelCommands {
  constructor(deps: LabelCommandsDependencies);
  changeIcon(id: string): MenuItem;
  rename(id: string): MenuItem;
}
```

- `rename(id)` runs `editor.edit({ target, value: textOf(id), label: 'Name' })`: a text sets the name
  (`labels.set(id, { name })`), `''` removes it (`{ name: null }`, the page title returns), `null` does
  nothing (FR-5, AC-5). `changeIcon(id)` runs `picker.pick({ anchor })`: `{ icon }` sets the icon,
  `{ reset: true }` calls `labels.clear(id)` (name and icon, Q-4), `null` does nothing. A `failed`
  outcome shows `Could not save the name` or `Could not save the icon` as an error toast (NFR-1). A
  target that is not on screen does nothing and logs once.
- Labels: `CHANGE_ICON_LABEL = 'Change Icon…'` and `RENAME_LABEL = 'Rename…'` in
  `src/shared/tabs/CommandLabels.ts`.
- Nothing here calls `BookmarkWriter`: FR-3 and AC-4 hold by construction, and the test makes any write
  fail.

**Saved rows.** `LinkActions` (`LinkMenuItems.ts` 3-12) gains `changeIcon` and `rename`
(`(linkId) => MenuItem | null`); group 2 of `LinkMenuItems.#groups` becomes `[changeIcon, rename, edit]`
(line 44), so they sit after the first group and before `Edit Pinned Page`, as in Arc and as 056 planned.
`SavedTabActions.create` fills the two slots with `LabelCommands` built once; its `target` is the row
`[data-vivarcdi-link-id="<id>"]` and its title element `.vivarcdi-folders-title`; `textOf` reads
`labels.get(id)?.name` then the bookmark title. `LinkExtras.copy` calls `labels.copy`, so Duplicate keeps
the name and icon (056 FR-3).

**Tiles.** `TileLinkCommands` of 057 puts the two items first in its group 2, before `Edit Pinned Page`
(057's table of groups is amended by T6: `Change Icon…`, `Rename…`, `Edit Pinned Page ▸`). `target` is the
tile `[data-vivarcdi-tile="<id>"]`, `covers` false. `GridDragging` builds the `LabelCommands` next to
`TileLinkCommands`, with `LinkLabels.of(storage, logger)`. A tile whose bookmark cannot be read, and a
tile that comes from a pinned tab, get no label items.

## Ordering with 057 and with 056

| Piece | Collides with | Rule |
|---|---|---|
| `LinkMenuItems.ts`, `SavedTabActions.ts`, `LinkExtras.ts` (T6) | 057 T3 moves these files to `src/shared/links/` | T6 starts after 057 T3 and works on the moved files |
| `TileLinkCommands.ts`, `TileMenu.ts`, `GridDragging.ts` (T6) | 057 T4 and T5 write them | T6 starts after 057 T5 |
| `CommandLabels.ts` (T6) | 057 T4 may add labels | One line each, resolved when merging |
| `FolderSection.ts`, `FolderRows.ts`, `FolderRowElement.ts`, `FavoritesView.ts`, `FavoritesFolder.ts`, `BookmarkFavorites.ts`, `FavoritesGrid.ts` (T2) | 057 does not touch them | T2 runs in parallel with 057 |
| `src/config.json` `styles` (T4, T5) | nobody else | One line each, resolved when merging |

So T2 to T5 run in parallel with 057, and T6 after 057 is merged. If 057 is not merged when T2 to T5
are done, T6 waits; nothing else is blocked.

## Components

| Class or file | Responsibility | Task |
|---|---|---|
| `src/core/browser/LinkLabels.ts` | Stores and notifies the labels | T2 |
| `src/shared/icons/LabelIcon.ts`, `IconSymbols.ts` | Draws an emoji or a symbol; the 24 symbols | T2 |
| `src/modules/folders/` (`FolderSection`, `view/FolderRows`, `view/FolderRowElement`) | Rows show name and icon | T2 |
| `src/modules/favorites/` (`FavoritesFolder`, `BookmarkFavorites`, `FavoritesView`, `FavoritesGrid`) | Tiles show name and icon | T2 |
| `tests/structure/StoredKeys.test.ts` | The new key reads through the shared reader | T2 |
| `src/shared/emoji/EmojiCatalog.ts`, `emoji.json` | The emoji list and the search | T3 |
| `src/shared/links/InPlaceEditor.ts`, `src/styles/inline-editor.scss` | The floating field | T4 |
| `src/shared/icons/IconPicker.ts`, `src/styles/icon-picker.scss` | The popover | T5 |
| `src/shared/links/LabelCommands.ts`, `CommandLabels.ts` | `Change Icon…` and `Rename…` | T6 |
| `LinkMenuItems`, `SavedTabActions`, `LinkExtras`, `TileLinkCommands`, `GridDragging` | The slots in both menus | T6 |
| `src/modules/workspacesync/LabelSync.ts` | Labels through the sync store (plan B only) | T7 |

## Texts and logs

Menu: `Change Icon…`, `Rename…`. Picker: `Emoji`, `Icons`, `Search`, `Reset`, the eight category
labels `Faces`, `Nature`, `Food`, `Activities`, `Travel`, `Objects`, `Symbols`, `Flags`, `Emoji are not
available`. Field: `Name`. Toasts (error): `Could not save the name`, `Could not save the icon`. Logger
`labels`: `warn` `labels are kept for this session only` (once); logger of the emoji file:
`warn` `The emoji list could not be loaded` (once).

## Configuration

None. The items follow the folders module (`bookmark-folders`) and the favorites module
(`favorites-grid`): they appear where those modules run.

## Acceptance criteria to tests

Names are the `auto:` texts, verbatim.

| AC | Test name | File |
|---|---|---|
| AC-1 | `manual` | checklist of T9 |
| AC-2 | `manual` | checklist of T9 |
| AC-3 | `resets name and icon` | `tests/core/browser/LinkLabels.test.ts` |
| AC-4 | `rename keeps the url` | `tests/shared/links/LabelCommands.test.ts` |
| AC-5 | `renames a saved tab in place` | `tests/shared/links/LabelCommands.test.ts` |
| AC-6 | `opens the icon picker with emoji and icons` | `tests/shared/icons/IconPicker.test.ts` |
| AC-7 | `filters the emoji by the search text` | `tests/shared/icons/IconPicker.test.ts` |
| AC-8 | `shows the chosen symbol of a saved tab` | `tests/modules/folders/view/FolderRowLabels.test.ts` |
| AC-9 | `adds rename and change icon to the menus of a row and a tile` | `tests/modules/favorites/LabelMenus.test.ts` |
| AC-10 | `shows the name and icon of a tile in every workspace` | `tests/modules/favorites/TileLabels.test.ts` |
| AC-11 | `manual` | checklist of T9 |

`AC-1` and `AC-2` stay `manual`: a restart and the look of the result cannot be read by a lab
scenario without a profile that keeps bookmarks, and the emoji on a tile needs the Favorites folder
that the lab profile does not have. `AC-11` is a comparison with the recording. No `live:` check, so
no scenario is owed by this spec.

Further tests, named freely: the store (`LinkLabels.test.ts`: set and read, a `name` removal keeps the
icon, an entry with nothing left is dropped, two modules see each other's change, a `failed` save is
returned, a newer or damaged value is read as the guard says, copy); the symbols (24, unique ids,
every `path` non-empty); `LabelIcon` (emoji text, svg with the path, unknown id draws nothing);
`EmojiCatalog` (eight categories in order, a keyword matches, several words must all match, an empty
search gives none, a missing file gives an empty catalog and one warning); `InPlaceEditor` (selected
text, Enter, blur, Escape, a second edit cancels the first, `reposition`, `no-drag`); the picker
(reset, Escape and a click outside resolve `null`, a symbol resolves `{ icon: { symbol } }`, `tabs:
['icons']` has no emoji tab, a catalog that fails leaves the `Icons` tab); the rows and tiles
(the name wins over the title of a tab that navigated away, an unknown symbol draws the favicon, a
label change redraws); `LinkMenuItems.test.ts` (group 2 order with and without the two slots) and
`TileMenu` or `TileLinkCommands` tests (the order of 057 with the items in group 2, no items for a tile
without a bookmark); the duplicate copies the label.

## Risks

- **Sync.** A bookmark id is local to a computer: plan B keeps the label per computer until T7 sends it
  through the sync store of 030, keyed by the address key of the link (two links with the same address
  share a label there). FR-1 names Vivaldi Sync; this is reported to Tore in the pull request that
  carries this design, and T7 is the one task he may defer.
- **A redraw while typing.** The field is outside the rows, so it survives a redraw; its anchor may be a
  new element, which `reposition()` handles; if the anchor is gone the edit is cancelled.
- **Picker weight.** About 1,400 buttons; drawn once and kept. If a probe on Debian shows lag, the grid
  is cut by category and drawn when scrolled to.
- **Shared files unused until T6.** Described above; the feature branch is merged to `main` only after
  T6.
- **The emoji data license.** The source and its license are named in the pull request of T3; the
  data is CLDR (Unicode License) or MIT, both compatible with the repository.
