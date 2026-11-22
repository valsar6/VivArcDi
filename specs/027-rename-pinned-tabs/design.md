# 027 Rename and re-icon pinned tabs: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

Rewritten after the revision of the spec was approved on 2026-11-22 (pull request #249) and amended the
same day after Tore's answers to the design review (FR-9 to FR-12, AC-12 to AC-16). The first design
(2026-11-09) cited `src/core/PinnedLabel.ts`, `src/modules/pinned/` and a fixed grid of 60 emoji; none of
that exists any more. It says **how**; the spec says **what**. It builds on the menu of a saved row of
[056](../056-saved-tab-menu/design.md), the menu of a tile of [057](../057-tile-menu/design.md), the
stored formats of [037](../037-versioned-storage/spec.md), the sync store of
[030](../030-workspace-sync/spec.md) and the folder icon of [033](../033-folder-menu/spec.md), which
reuses the picker.

## Approach

### Today (verified in the code, `origin/main` 1ec2eca)

| Fact | Where |
|---|---|
| No code keeps a custom name or icon for a link: the only "custom name" of a saved row is its bookmark title, which Vivaldi's panel edits and Vivaldi Sync carries. `LinkExtras.copy` is a no-op waiting for this spec | `src/modules/folders/editing/LinkExtras.ts` 1-14; `SyncStore.ts` 76-90 |
| The menu of a saved row is `LinkMenuItems`; group 2 is only `Edit Pinned Page`; the slots come from `SavedTabActions.create` | `src/modules/folders/editing/LinkMenuItems.ts` 3-12, 39-48; `SavedTabActions.ts` 45-52 |
| The menu of a tile is `TileMenu`: `Untile tab`, `Pin tab`, then the web panel item; 057 (not implemented) puts the link groups before them | `src/modules/favorites/TileMenu.ts` 60-79; `specs/057-tile-menu/design.md` |
| A link row gets its title in `FolderRows.#link` (the title of the open tab when it navigated elsewhere, else the bookmark title) and its icon in `FolderRowElement.#fillLink` through `LinkIcon.create` (an `img`) | `src/modules/folders/view/FolderRows.ts` 85-89; `FolderRowElement.ts` 58-67; `src/shared/links/LinkIcon.ts` 17-24 |
| A tile is icon-only: a letter and an `img`; its title is only the native tooltip (`tile.title`) | `src/modules/favorites/FavoritesView.ts` 114-127 |
| Tiles come from bookmarks (`BookmarkFavorites`, no storage today) or, when the folder is missing or the pinned tabs are more, from the pinned tabs of the active workspace that have no `favoriteId` (`PinnedFavorites`): their tile id is the **tab id** (`String(tab.id)`), there is no bookmark | `src/modules/favorites/BookmarkFavorites.ts` 138-147; `PinnedFavorites.ts` 81-89, 150-153 |
| A pinned tab keeps its own page in `vivExtData.vivarcdi.pinnedUrl`; `OwnPage.keyOf(tab)` is the address key of that page, or of the page it shows | `src/core/tabs/TabData.ts` 4-13, 94-112; `src/shared/tabs/OwnPage.ts` 33-36; written by `SavedAddresses` through `TabDataWriter` (042) |
| 030 carries data in the sync store, the bookmark folder `VivArcDi Sync`: pinned tabs as bookmarks keyed by address key, and one JSON text per workspace in the description of its `Settings` bookmark, read and written by key through `WorkspaceSettings.get/set(workspaceName \| null, key)` (the last write of a key wins; `null` is the area outside any workspace) | `src/modules/workspacesync/SyncStore.ts` 76-100; `WorkspaceSettings.ts` 29-48 |
| The window storage is a `VersionedStorage`; a store reads with `storage.read(key, format)` and writes with `save`, which returns `saved`, `failed` or `memory` | `src/core/boot/Module.ts` 46-47; `src/core/browser/StoredFormat.ts`; `SavingStorage.ts` |
| `LastOpenedStore` shows the pattern of a `StoredFormat` at version 1 | `src/shared/links/LastOpenedStore.ts` 8-19 |
| `BookmarkNode` has `id`, `parentId`, `index`, `title`, `description`, `url`, `children`; no `vivExtData` and no `guid`; `BookmarkWriter.update` takes `{ title }` | `src/core/browser/bookmarks/BookmarkNode.ts`; `BookmarkWriter.ts` 14-18, 80-82 |
| `FolderNameEditor` is the in-place field of folder rows, tied to folders and to `FolderSectionView.render`; rows are redrawn with `replaceChildren` | `src/modules/folders/editing/FolderNameEditor.ts`; `view/FolderSectionView.ts` 87-101 |
| The favicon of a link is read from `chrome://favicon/size/16@2x/<url>` or, for an open tab, from its `favIconUrl` | `src/shared/links/LinkIcon.ts` 1-24; `OpenLinks.ts` 112-122 |
| Static payload files are every `.json` under `src/`, copied to `dist/` with the same path and read through `context.payload.json(path)` | `scripts/build.mjs` 153-171; `src/core/boot/ResourceLoader.ts` 41-43 |
| `max-lines` is 200 per file, `max-lines-per-function` 40; the boundary tests refuse a shared file used by fewer than two modules and a core file used by core by none and by fewer than two modules | `eslint.config.mjs` 12-15; `tests/structure/ModuleBoundaries.test.ts` 81-116 |

### Where the pieces live

Both modules, `folders` (saved rows) and `favorites` (tiles), need the same things, so each is a
legitimate file of `src/shared/` or `src/core/` (spec 034: used by two modules):

| Piece | Home | Used by |
|---|---|---|
| The label store `LinkLabels` and its keys | `src/core/browser/LinkLabels.ts` | `FolderSection`, `BookmarkFavorites`, `PinnedFavorites` (T2) |
| The label icon `LabelIcon` and the 24 symbols `IconSymbols` | `src/shared/icons/` | `FolderRowElement`, `FavoritesView` (T2), then the picker |
| The emoji data and search `EmojiCatalog`, with `src/shared/emoji/emoji.json` | `src/shared/emoji/` | the picker (T3) |
| The favicon reader `FaviconReader` | `src/shared/icons/FaviconReader.ts` | `LabelCommands` (T7) |
| The in-place editor `InPlaceEditor` | `src/shared/links/InPlaceEditor.ts` | `LabelCommands` (T4) |
| The picker `IconPicker` | `src/shared/icons/IconPicker.ts` | `LabelCommands` (T5), and 033 for folders |
| The two menu items `LabelCommands` | `src/shared/links/LabelCommands.ts` | `SavedTabActions` and `TileLinkCommands` (T6) |
| The hover name `TileHoverName` | `src/modules/favorites/` | only favorites: no sharing needed (T8) |
| The name sync `LabelSync` | `src/modules/workspacesync/` | only workspacesync (T9) |

Until T6 wires them into the two modules, the files of T3, T4, T5 and T7 are used by no module and the
test `every shared file is used by two modules` lists them. T2 is green on its own because both modules
import its files. The tasks that wait for T6 (see [tasks.md](tasks.md)) are merged into one feature branch,
which goes to `main` after T6, so `main` never sees the red state.

### The key of a label

A label is stored under an opaque key, built by `LabelKeys` (in `LinkLabels.ts`):

| Thing | Key | Why |
|---|---|---|
| A saved row, a bookmark tile | `bookmark:<bookmark id>` | the bookmark is the thing the user sees; two bookmarks with one address keep their own label |
| A tile made from a pinned tab (FR-10) | `page:<address key>` with `OwnPage.keyOf(tab)` | the tab id changes at every start, the own page of a pinned tab does not; it is also what 030 matches pinned tabs by (`PinnedMerge`, `SyncStore.writePinned`). A tab with no web address has no key: it shows no items |

`Favorite` gains `labelKey?: string`, set by `BookmarkFavorites` and `PinnedFavorites`; `FavoritesView`
writes it on the tile element as `data-vivarcdi-label-key`, so the menu finds the key of a tile from
the tile, whatever its source. A saved row's key is built from its link id.

### Storage: plan A and plan B (Q-2, FR-1)

| Plan | Where the name and icon live | Chosen when |
|---|---|---|
| A | A field of the bookmark node itself (`vivExtData` or another field Vivaldi carries), written through `BookmarkWriter` | T1 shows that the API accepts and returns the field and Vivaldi's panel does not show it |
| B | `vivarcdi.labels` in the window storage, a `StoredFormat` version 1 of `{ [labelKey]: LinkLabel }` | A is not proven |

**Plan B is the default**, and it is the only one that can hold a label for a tile made from a pinned
tab (FR-10), which has no bookmark; with plan A that tile would need the tab's `vivExtData` through
`TabDataWriter` (042) as a second home. The extension API of `chrome.bookmarks.update` ignores unknown
members and the node has no `vivExtData` in the code, so A is unlikely. The public interface of
`LinkLabels` below is the same in both plans, so the other tasks do not wait for T1. T2 starts after T1;
if T1 confirms A, the lead amends this section first.

**The probe (T1).** Run by the lead with `npm run live -- --probe <file>`, only after Tore agrees.
`ProbeGuard` rejects `chrome.bookmarks.update` and `create` in a probe (spec 046) and the lab profile has
no bookmarks, so for the storage it can only read:

| # | Question | How | What it settles |
|---|---|---|---|
| F-1 | Which methods the bookmarks APIs have | `Object.keys` of `chrome.bookmarks` and of `vivaldi.bookmarksPrivate` | Whether a method that sets Vivaldi-specific fields exists |
| F-2 | Which members a node has | `getTree` and `get` of the permanent folders and the Trash: the union of own property names | Which Vivaldi members exist (`description`, `nickname`, `themeColor`, `guid`, `vivExtData`) |
| F-3 | Whether the bookmark id is stable between runs | Two probes of the same profile | That an id is a good key on one computer |
| F-4 | What the API offers to read a favicon again | On a lab tab (a probe may create and move tabs): `tab.favIconUrl` after a navigation to a page that has an icon, its form (`https`, `data:`, `chrome://`), and its change when the page changes its icon | Plan A of the favicon (below) |
| F-5 | Whether the window can fetch the page of a site | A `fetch` of a public page and of `/favicon.ico` from the UI window: allowed, blocked by CORS or by the policy of the window | Plan B of the favicon |
| F-6 | Whether `chrome://favicon/size/16@2x/<url>` follows a changed icon | Load it before and after a tab changed its icon, and with a changing query string | Whether the service can simply be asked again |

What a probe cannot prove: a write of a candidate field round-trips (the lead tries `create` and `update`
in a temporary scenario on the throwaway profile, not committed, only if F-1 or F-2 shows a candidate),
and that Vivaldi's panel does not show it. Tore proves what the lab cannot (sync between his two
computers: AC-16). The lead writes the findings into a table under this heading before T2 and T7 start,
as 056 did.

**Findings (T1, 2026-11-22, lab Vivaldi 8.3.4191.47, two runs of the same probe, kept outside the repository).**

| # | Finding | Effect on the plan |
|---|---|---|
| F-1 | `chrome.bookmarks` has the eleven standard methods; `vivaldi.bookmarksPrivate` has `emptyTrash`, `export`, `getFolderIds`, `isCustomThumbnail`, `updatePartners`, `updateSpeedDialsForWindowsJumplist`. No method sets a custom field. | None. |
| F-2 | The members of a node are `bookmarkbar`, `children`, `dateAdded`, `description`, `folderType`, `id`, `index`, `nickname`, `parentId`, `partner`, `speeddial`, `syncing`, `themeColor`, `thumbnail`, `title`, `trash` and **`uuid`**. There is no `vivExtData` and no `guid`. The only free candidates are `nickname` (Vivaldi's keyword of the bookmark, synced) and `description` (030's `Settings` bookmark uses it); both mean something else. | **Plan A is not adopted: plan B stays** (`vivarcdi.labels`). |
| F-2b | `uuid` is a stable identifier that Vivaldi Sync carries between computers. | **Confirmed by Tore (2026-11-22): "so that if I change the address I know it was that very favorite".** The name sync keys a row or a tile from a bookmark by its `uuid` (`name:uuid:<uuid>`), not by its address. That removes the quirk of two links with the same address sharing a name; a tile from a pinned tab keeps `name:page:<address key>`. `BookmarkNode` must then expose `uuid`. Not proven in the lab: that a bookmark created by VivArcDi gets a `uuid` at once (a probe cannot create one). |
| F-3 | Same ids and members in both runs (`0`, `1`, `2`, `4`); the lab has no bookmark of its own, so the stability of a user bookmark's id is not proven. | An id is the local key; the `uuid` is the key across computers. |
| F-4 | A lab tab reports `favIconUrl` about one second after a load: `https://www.wikipedia.org/static/favicon/wikipedia.ico` (the `https` form). Its change when a page changes its icon is not probed. | Plan 1 of the favicon works for a page that is open. |
| F-5 | The UI window can `fetch` a page (`ok`, `type: basic`, the page has a `link rel=icon`) and its `/favicon.ico` (`image/vnd.microsoft.icon`, 2.7 KB). | Plan 2 works for a page that is not open. |
| F-6 | `chrome://favicon/size/16@2x/<url>` and `chrome://favicon2/?size=32&pageUrl=` both load (32 px), also with a changing query string. Whether they follow a changed icon is not provable in the lab. | Plans 3 and 4 are not needed unless Tore's checks of a real site fail. |

**Storage plan: B. Favicon plan: 1 (the `favIconUrl` of the open tab), then 2 (fetch of the page and
`/favicon.ico`).** Not provable in the lab: the round trip of a write to a bookmark field, what Vivaldi's
panel does with one, the sync between two computers and the refresh of a real site that changed its icon
(AC-15, AC-16 and the checklist).

### The name and Vivaldi Sync (FR-9, AC-12)

**What exists.** For a saved row the custom name is the bookmark title, and Vivaldi Sync already carries
it; for a tile from a pinned tab, 030 carries the page title of the pinned tab. No VivArcDi field holds a
name apart from the title. FR-3 says renaming never changes the bookmark title (Vivaldi's panel and
the page title stay what they are), so the name cannot use that path. **What is reused** is the other
path of 030: the `Settings` bookmark of each workspace in the sync store, read and written through
`WorkspaceSettings`, which Vivaldi Sync carries as a bookmark description.

**How.** `LabelSync` in `src/modules/workspacesync/` (T9) keeps the names, and only the names (the
icon, the favicon and the name's emoji stay local: out of scope, spec), in the workspace settings under
one key per link, with the name as the value and `null` for a removed name: `name:uuid:<uuid>` for a row
or a tile from a bookmark, with the `uuid` that Vivaldi gives every bookmark node and Sync carries between
computers (probe F-2b; `BookmarkNode` gains `uuid`), so a link stays itself when its address changes; and
`name:page:<address key>` for a tile made from a pinned tab, which has no bookmark, with the address key
that 030 uses to match pinned tabs (`AddressKey.from(url)`). Ids of bookmarks and of tabs are local to a
computer.

- **Out.** On `LinkLabels.onChange`, the names that changed since the last snapshot are written. The
  area of a label is found like this: `page:<key>` is the workspace of the active pinned tab (`TabData.of`
  then `WorkspaceNames`), `bookmark:<id>` is looked up in the bookmark tree, which also gives its `uuid`: a link under
  `<workspacesBase>/<workspace name>` belongs to that workspace, one under the base folder or under the
  Favorites folder to the area outside any workspace (`null`). `workspacesBase` and the Favorites folder
  are the options of the folders and favorites modules, read through `context.modules` as 030 reads
  them; a bookmark elsewhere is not synced.
- **In.** After each sync pass of 030, for every workspace area, each `name:uuid:<uuid>` is applied to the
  label of the bookmark of this computer with that `uuid`, and each `name:page:<key>` to the labels whose
  address key matches (`page:<key>`): `LinkLabels.set(key, { name })` with the "applied by sync" flag, which is not
  written back (030 FR-4). A `null` removes the name.
- Two computers that rename the same link race on one key: the last write wins, as for every setting of
  030. A bookmark that has no `uuid` yet (not proven for one created by VivArcDi) is skipped and
  tried again at the next pass. Listed in Risks.

### Display (FR-2, FR-8, FR-10)

- **Rows.** `RowSources` gains `labels: (id: string) => LinkLabel | undefined`. `FolderRows.#link` uses
  `label.name` instead of the title (it also wins over the title of an open tab that navigated away)
  and `LinkRow` gains `icon?: LabelIcon` and `favicon?: string`. `FolderRowElement.#fillLink` draws
  `LabelIcon.create(...)` when the row has an icon, else `LinkIcon.create` with `favicon` as
  `favIconUrl` when the label has one, else as today. `FolderSection.#draw` builds the sources with one
  `labels.all()` per draw and redraws on `labels.onChange`.
- **Tiles.** `Favorite` gains `labelKey?`, `icon?` and `favicon?`; `BookmarkFavorites.#receive` and
  `PinnedFavorites.#read` map the favorites through `labels.all()` (the title becomes the name),
  keep the last list and show it again on `labels.onChange`. `FavoritesView.#tileOf` draws the icon
  with `LabelIcon` instead of the letter and the `img` (or the `img` with `favicon`), and writes
  `data-vivarcdi-label-key`. Tiles of bookmarks are the same in every workspace (AC-10); the tiles of
  pinned tabs are those of the active workspace, as today.
- A reset removes the entry, so the next draw is the one of today (AC-3).

## The label store (T2)

```ts
export type LabelIcon = { emoji: string } | { symbol: string };

export interface LinkLabel {
  /** The short name; absent shows the page title. */
  name?: string;
  /** The emoji or symbol; absent shows the favicon. */
  icon?: LabelIcon;
  /** The favicon read again from the site (FR-12); the icon wins over it. */
  favicon?: string;
}

export interface LabelChange {
  /** A text sets the field, null removes it. */
  name?: string | null;
  icon?: LabelIcon | null;
  favicon?: string | null;
}

export class LabelKeys {
  static bookmark(id: string): string;
  /** Null when the tab has no web address. */
  static page(tab: chrome.tabs.Tab): string | null;
}

export class LinkLabels {
  /** One instance for each window storage, so the modules see each other's changes. */
  static of(storage: VersionedStorage, logger: Logger): LinkLabels;
  get(key: string): LinkLabel | undefined;
  all(): ReadonlyMap<string, LinkLabel>;
  set(key: string, change: LabelChange, options?: { fromSync?: boolean }): Promise<SaveOutcome>;
  clear(key: string): Promise<SaveOutcome>;
  copy(fromKey: string, toKey: string): Promise<void>;
  onChange(listener: (change: { key: string; fromSync: boolean }) => void): () => void;
}
```

- Key `vivarcdi.labels`, `StoredFormat<Record<string, LinkLabel>>` at version 1 (bare JSON, as
  `LastOpenedStore`); `read` rejects the shape as a whole when the value is not an object and skips an
  entry whose `name` or `favicon` is not a string, or whose `icon` has neither `emoji` nor `symbol` as a
  non-empty string (`skipped: true`). A `favicon` that is not an `http`, `https` or `data:image` address,
  or a `data:` address longer than 8 KB, is refused on write and skipped on read. A `newer` value is
  read-only through the guard of 037. The key is added to `readEveryStore` and to the `expected` list of
  `tests/structure/StoredKeys.test.ts`, whose test name does not change.
- `set` reads the current map, applies the change, drops an entry left with nothing, notifies the
  listeners at once (the screen follows the memory) and returns `storage.save(KEY, FORMAT.encode(map))`;
  it never throws. `clear(key)` removes the whole entry: name, icon and favicon.
- `of` keeps a `WeakMap<VersionedStorage, LinkLabels>`; the listeners live in the instance.
- `copy` copies the whole entry; it fills the hook of 056: `LinkExtras.copy` calls it with two
  `bookmark:` keys (T6).
- Nothing in `LinkLabels` takes a `BookmarkWriter`: a name or an icon cannot change a URL or a title
  (FR-3, AC-4). Logger child `labels`: `warn` `labels are kept for this session only` once, when `save`
  gives `failed`.
- Orphan entries (the bookmark was deleted, a pinned tab is gone) stay in the value; they are a few bytes
  each and a later cleanup may prune them.

**Icons.** `LabelIcon.create(document, icon, className): HTMLElement` returns a `span` with the emoji as
text, or a `span` with an inline `svg` (`createElementNS`, `viewBox="0 0 24 24"`, `fill="none"`,
`stroke="currentColor"`, `stroke-width="1.8"`, round caps, one `path` of the symbol) so it takes the color
of the row. `IconSymbols.all(): readonly IconSymbol[]` (`{ id, label, path }`) are the 24 line symbols of
033 FR-9; the ids are stored, so they are fixed here: `star`, `bookmark`, `heart`, `bolt`, `triangle`,
`gear`, `bell`, `pin`, `chat`, `people`, `plane`, `ball`, `moon`, `globe`, `music`, `camera`, `code`,
`smile` (the 18 the recording and 033 name) and `home`, `book`, `mail`, `cloud`, `flag`, `key` (the six
033 leaves to "…"). `IconSymbols.byId(id)` returns one or undefined; a stored id that is unknown draws
the favicon.

## The in-place editor (T4, FR-5, FR-7, FR-11)

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
  background of the row, or 160 px wide below the tile; `-webkit-app-region: no-drag`; the field is
  focused with the text selected; keydown stops propagation so Vivaldi's shortcuts do not run.
- Enter and a click outside (blur) finish with the text, which is saved (Tore, 2026-11-22); Escape and
  `cancel()` resolve `null`; only one field is open, a second `edit` cancels the first. The wiring calls
  `reposition()` after `FolderSectionView.render` and after `FavoritesView.show`.
- A tile shows no text, so its field sits under the icon with the current name or title (FR-11).
- Styles: `src/styles/inline-editor.scss`, `styles/inline-editor.css` in `src/config.json`, the attribute
  `data-vivarcdi-inline-editor`. `FolderNameEditor` is not touched; 033 may adopt `InPlaceEditor` later.

## The hover name of a tile (T8, FR-11, AC-14)

A tile shows no title. `TileHoverName` in `src/modules/favorites/`:

```ts
export const HOVER_NAME_MS = 3000;

export class TileHoverName {
  constructor(deps: { document: Document; parent: () => Element; timers: { set(run: () => void, ms: number): unknown; clear(handle: unknown): void } });
  /** Listens on the grid; `textOf` gives the text of a tile element. Returns the function that stops it. */
  attach(grid: HTMLElement, textOf: (tile: HTMLElement) => string): () => void;
}
```

- On `mouseover` of a tile (`TILE_ATTRIBUTE`) it starts a timer of `HOVER_NAME_MS`; the timer is
  cleared on `mouseout` of that tile and on `mousedown`, `contextmenu`, `dragstart` and `wheel`. When it
  fires, a label element `data-vivarcdi-tile-name` is added to `#browser` below the tile, clamped to
  the window, `pointer-events: none`, no-drag; it is removed on `mouseout` and with the same events.
- The text is the name, else the page title, which the view writes on the tile as
  `data-vivarcdi-tile-label`; the native `title` of the tile is removed so the two do not show together.
- `FavoritesView` builds it in its constructor and stops it in `destroy`. Style in
  `src/styles/favorites.scss` (a block of its own, as the other tile attributes).
- The tests use fake timers (the label is absent at 2999 ms, present at 3000 ms, gone on leaving).

## The favicon refresh (T7, FR-12, AC-15)

A site changes its icon but Vivaldi's favicon cache, or a favicon stored in the bookmark, keeps the old
one. `Refresh favicon` reads the icon of the site again and keeps the result in the label as `favicon`
(local, not synced), which draws instead of the service favicon; picking an emoji or a symbol clears it
and `Reset` removes it.

```ts
export interface FaviconReader {
  /** The address of the site's current favicon, or null when none could be read. */
  read(request: { url: string; tab?: chrome.tabs.Tab }): Promise<string | null>;
}
```

`FaviconReader` is chosen by T1 (F-4 to F-6); the hypothesis and the fallbacks, in this order:

1. **The open tab.** When the link has an open tab (`LinkedTab`, or the tab of a pinned tile),
   `tab.favIconUrl` is what Vivaldi shows now: read after the tab reloaded or when it is already
   loaded. Not available for a link with no tab.
2. **The page.** The window fetches the page, takes `link[rel~="icon"]` (the largest) or
   `/favicon.ico`, and checks that an `Image` loads from it. Used if F-5 shows that the window may fetch.
3. **A hidden tab.** Open the address in a background tab of the lab-safe kind (`active: false`),
   wait for `favIconUrl`, close it; heavy and visible to the tab list, so only if 1 and 2 fail the probe.
4. **None.** The label does not change and the toast says `Could not read the favicon`.

An address that is not `http` or `https` is refused with the same toast. A `data:` result longer than 8 KB
or a result that does not load is treated as none. The reader never throws.

## The picker (T3 and T5, FR-6, FR-7, FR-12, Q-3, Q-4)

**Emoji data (T3).** `src/shared/emoji/emoji.json`, loaded the first time the picker opens with
`context.payload.json('shared/emoji/emoji.json')` (the file is copied by the build like the selector
catalogs, `scripts/build.mjs` 167), so the payload that starts with Vivaldi does not carry 1,400 emoji:

```json
{ "unicode": "15.1", "categories": [
  { "id": "faces", "label": "Faces", "emoji": [ { "e": "<the character>", "n": "grinning face", "k": ["smile", "happy"] } ] } ] }
```

The categories, in this order, are the eight of the recording: `faces`, `nature`, `food`, `activities`,
`travel`, `objects`, `symbols`, `flags`. The list is the base emoji of Unicode 15.1 without skin-tone and
ZWJ variants, with the CLDR English name and up to four keywords each. The implementer produces the file
once from a published emoji dataset with a one-off command that is not added to the repository, and no
dependency is added; the pull request names the source and its license. `EmojiCatalog`:

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

**`IconPicker` (T5)** in `src/shared/icons/`, a popover beside the anchor, generic for 033:

```ts
export type PickerTab = 'emoji' | 'icons';
export type PickResult = { icon: LabelIcon } | { reset: true } | { refresh: true };

export interface PickerCatalog {
  categories(): readonly { id: string; label: string; emoji: readonly { emoji: string; name: string }[] }[];
  search(text: string): readonly { emoji: string; name: string }[];
}

export class IconPicker {
  constructor(deps: { document: Document; parent: () => Element; catalog: () => Promise<PickerCatalog>; symbols: readonly { id: string; label: string; path: string }[] });
  /** Resolves the choice, or null on Escape or a click elsewhere. `refresh` shows the Refresh favicon button. */
  pick(options: { anchor: HTMLElement; tabs?: readonly PickerTab[]; refresh?: boolean }): Promise<PickResult | null>;
  close(): void;
}
```

The picker declares the structural types it needs, so T5 does not import the files of T2 or T3 and the
tasks run in parallel; `EmojiCatalog` and `IconSymbols` satisfy them.

- Layout as in the recording: the tabs `Emoji` and `Icons` on top; at their right the two buttons
  `Refresh favicon` (shown when `refresh` is true; a circular arrow, `aria-label` `Refresh favicon`) and
  `Reset` (trash, `aria-label` `Reset`). The `Emoji` tab has a search field (`placeholder` `Search`,
  focused when the popover opens), a scrolling grid of buttons and the eight category buttons at the
  bottom, which scroll the grid to the category. Typing replaces the grid with `search(text)`; clearing
  brings the categories back. The `Icons` tab is the 24 symbols in a grid of six by four, each a button
  with the label as `aria-label`. `tabs` default to both; 033 asks for what it needs and no `refresh`.
- A click on an emoji or a symbol resolves `{ icon }` and closes; `Reset` resolves `{ reset: true }`;
  `Refresh favicon` resolves `{ refresh: true }`; Escape, a pointer down outside and `close()` resolve
  `null`; a second `pick` closes the first. The popover is placed to the right of the anchor, to the left
  when there is no room, clamped to the window (`ContextMenu` has the same rule for its submenus);
  `-webkit-app-region: no-drag`.
- Attributes for tests and styles: `data-vivarcdi-picker`, `data-vivarcdi-picker-header`, `data-vivarcdi-picker-pane` (`emoji`, `icons`), `data-vivarcdi-picker-body`, `data-vivarcdi-picker-grid` (`emoji`, `icons`), `data-vivarcdi-picker-bar`, `data-vivarcdi-picker-tab` (`emoji`, `icons`),
  `data-vivarcdi-picker-search`, `data-vivarcdi-picker-cell`, `data-vivarcdi-picker-category`,
  `data-vivarcdi-picker-reset`, `data-vivarcdi-picker-refresh`. Styles `src/styles/icon-picker.scss`,
  `styles/icon-picker.css` in `config.json`, the tokens in `_tokens.scss`; the stylesheet targets those
  marks, never the position of a child, since the emoji body is a wrapper reused between opens.
- 1,400 buttons are drawn once, on first open; a later open reuses them.

## The two menu items (T6, FR-4, FR-5, FR-6, FR-10, FR-12)

**`LabelCommands`** in `src/shared/links/`:

```ts
export interface LabelCommandsDependencies {
  labels: Pick<LinkLabels, 'get' | 'set' | 'clear'>;
  editor: Pick<InPlaceEditor, 'edit'>;
  picker: Pick<IconPicker, 'pick'>;
  favicon: Pick<FaviconReader, 'read'>;
  /** The label key of a row or tile id, or null when it has none (a pinned tab with no web address). */
  keyOf: (id: string) => string | null;
  /** Where the id is drawn, or null when it is not on screen. */
  target: (id: string) => EditTarget | null;
  /** The text the field starts with: the name, else the title the row or tile shows. */
  textOf: (id: string) => string;
  /** The address and the open tab of the id, for the favicon. */
  pageOf: (id: string) => Promise<{ url: string; tab?: chrome.tabs.Tab } | null>;
  notify: (text: string, kind?: ToastKind) => void;
  logger: Logger;
}

export class LabelCommands {
  constructor(deps: LabelCommandsDependencies);
  /** The two items, or none when the id has no key. */
  items(id: string): MenuItem[];
}
```

- `Rename…` runs `editor.edit({ target, value: textOf(id), label: 'Name' })`: a text sets the name, `''`
  removes it (the page title returns), `null` does nothing (FR-5, AC-5). `Change Icon…` runs
  `picker.pick({ anchor, refresh: true })`: `{ icon }` sets the icon and removes the favicon,
  `{ reset: true }` calls `labels.clear(key)` (name, icon and favicon, Q-4, FR-12), `{ refresh: true }`
  asks `favicon.read(await pageOf(id))` and sets `{ favicon, icon: null }`, or shows `Could not read the
  favicon` as an error toast when it gives null (AC-15), `null` does nothing. A `failed` save shows
  `Could not save the name` or `Could not save the icon` as an error toast (NFR-1). A target that is not
  on screen does nothing and logs once.
- Labels: `CHANGE_ICON_LABEL = 'Change Icon…'` and `RENAME_LABEL = 'Rename…'` in
  `src/shared/tabs/CommandLabels.ts`.
- Nothing here calls `BookmarkWriter`: FR-3 and AC-4 hold by construction, and the test makes any write
  fail.

**Saved rows.** `LinkActions` (`LinkMenuItems.ts` 3-12) gains `changeIcon` and `rename`
(`(linkId) => MenuItem | null`), each the matching member of `LabelCommands.items`; group 2 of
`LinkMenuItems.#groups` becomes `[changeIcon, rename, edit]` (line 44), so they sit after the first group
and before `Edit Pinned Page`, as in Arc and as 056 planned. `SavedTabActions.create` fills the slots
with one `LabelCommands`; `keyOf` is `LabelKeys.bookmark`, `target` is the row
`[data-vivarcdi-link-id="<id>"]` with `.vivarcdi-folders-title`, `pageOf` reads the bookmark url and
`LinkedTab`. `LinkExtras.copy` calls `labels.copy`, so Duplicate keeps the label (056 FR-3).

**Tiles, including those of pinned tabs.** `TileLinkCommands` of 057 puts the label items first in its
group 2, before `Edit Pinned Page` (057's table of groups is amended by T6: `Change Icon…`, `Rename…`,
`Edit Pinned Page ▸`). When the bookmark of the tile cannot be read, which is every tile made from a
pinned tab, `TileLinkCommands.items` no longer returns nothing: it returns the label items alone, as one
group, so the menu is `Change Icon…`, `Rename…`, separator, `Untile tab`, `Pin tab`. `keyOf(id)` reads
`data-vivarcdi-label-key` from the tile `[data-vivarcdi-tile="<id>"]`; `target` has `covers` false;
`pageOf` gives the tile's url and, for a pinned tab, the tab. A tile with no key gets no items.
`GridDragging` builds the `LabelCommands` next to `TileLinkCommands`, with `LinkLabels.of(storage,
logger)`.

## Ordering with 057 and with 056

| Piece | Collides with | Rule |
|---|---|---|
| `LinkMenuItems.ts`, `SavedTabActions.ts`, `LinkExtras.ts` (T6) | 057 T3 moves these files to `src/shared/links/` | T6 starts after 057 T3 and works on the moved files |
| `TileLinkCommands.ts`, `TileMenu.ts`, `GridDragging.ts` (T6) | 057 T4 and T5 write them | T6 starts after 057 T5 |
| `CommandLabels.ts` (T6) | 057 T4 may add labels | One line each, resolved when merging |
| `FolderSection.ts`, `FolderRows.ts`, `FolderRowElement.ts`, `FavoritesView.ts`, `FavoritesFolder.ts`, `BookmarkFavorites.ts`, `PinnedFavorites.ts`, `FavoritesGrid.ts` (T2); `FavoritesView.ts`, `favorites.scss` (T8) | 057 does not touch them | T2 runs in parallel with 057; T8 follows T2 (same `FavoritesView.ts`) |
| `src/modules/workspacesync/` (T9) | 057 does not touch it | Parallel with 057 |
| `src/config.json` `styles`, `_tokens.scss` (T4, T5) | nobody else | One line or block each, resolved when merging |

So T2 to T5, T7, T8 and T9 run in parallel with 057, and T6 comes after it. If 057 is not merged when
the others are done, T6 waits; nothing else is blocked.

## Components

| Class or file | Responsibility | Task |
|---|---|---|
| `src/core/browser/LinkLabels.ts` | Stores and notifies the labels; the keys | T2 |
| `src/shared/icons/LabelIcon.ts`, `IconSymbols.ts` | Draws an emoji or a symbol; the 24 symbols | T2 |
| `src/modules/folders/` (`FolderSection`, `view/FolderRows`, `view/FolderRowElement`) | Rows show name and icon | T2 |
| `src/modules/favorites/` (`FavoritesFolder`, `BookmarkFavorites`, `PinnedFavorites`, `FavoritesView`, `FavoritesGrid`) | Tiles show name and icon, carry the label key | T2 |
| `tests/structure/StoredKeys.test.ts` | The new key reads through the shared reader | T2 |
| `src/shared/emoji/EmojiCatalog.ts`, `emoji.json` | The emoji list and the search | T3 |
| `src/shared/links/InPlaceEditor.ts`, `src/styles/inline-editor.scss` | The floating field | T4 |
| `src/shared/icons/IconPicker.ts`, `src/styles/icon-picker.scss` | The popover with Reset and Refresh favicon | T5 |
| `src/shared/links/LabelCommands.ts`, `CommandLabels.ts` | `Change Icon…` and `Rename…` | T6 |
| `LinkMenuItems`, `SavedTabActions`, `LinkExtras`, `TileLinkCommands`, `GridDragging` | The slots in both menus | T6 |
| `src/shared/icons/FaviconReader.ts` | Reads a favicon again | T7 |
| `src/modules/favorites/TileHoverName.ts`, `FavoritesView.ts`, `src/styles/favorites.scss` | The name after 3 s | T8 |
| `src/modules/workspacesync/LabelSync.ts`, `WorkspaceSync.ts` | The names through the sync store | T9 |

## Texts and logs

Menu: `Change Icon…`, `Rename…`. Picker: `Emoji`, `Icons`, `Search`, `Reset`, `Refresh favicon`, the eight
category labels `Faces`, `Nature`, `Food`, `Activities`, `Travel`, `Objects`, `Symbols`, `Flags`, `Emoji
are not available`. Field: `Name`. Toasts (error): `Could not save the name`, `Could not save the icon`,
`Could not read the favicon`. Logger `labels`: `warn` `labels are kept for this session only` (once);
logger of the emoji file: `warn` `The emoji list could not be loaded` (once); logger of `workspace-sync`:
`warn` `a name from the sync store could not be applied: <reason>` (once per session).

## Configuration

None. The items follow the folders module (`bookmark-folders`) and the favorites module
(`favorites-grid`); the name sync follows `workspace-sync` and its `enabled` option.

## Acceptance criteria to tests

Names are the `auto:` texts, verbatim.

| AC | Test name | File |
|---|---|---|
| AC-1 | `manual` | checklist of T11 |
| AC-2 | `manual` | checklist of T11 |
| AC-3 | `resets name and icon` | `tests/core/browser/LinkLabels.test.ts` |
| AC-4 | `rename keeps the url` | `tests/shared/links/LabelCommands.test.ts` |
| AC-5 | `renames a saved tab in place` | `tests/shared/links/LabelCommands.test.ts` |
| AC-6 | `opens the icon picker with emoji and icons` | `tests/shared/icons/IconPicker.test.ts` |
| AC-7 | `filters the emoji by the search text` | `tests/shared/icons/IconPicker.test.ts` |
| AC-8 | `shows the chosen symbol of a saved tab` | `tests/modules/folders/view/FolderRowLabels.test.ts` |
| AC-9 | `adds rename and change icon to the menus of a row and a tile` | `tests/modules/favorites/LabelMenus.test.ts` |
| AC-10 | `shows the name and icon of a tile in every workspace` | `tests/modules/favorites/TileLabels.test.ts` |
| AC-11 | `manual` | checklist of T11 |
| AC-12 | `syncs the name of a saved tab` | `tests/modules/workspacesync/LabelSync.test.ts` |
| AC-13 | `renames and re-icons a tile made from a pinned tab` | `tests/modules/favorites/PinnedTileLabels.test.ts` |
| AC-14 | `shows the name of a tile after a hover of three seconds` | `tests/modules/favorites/TileHoverName.test.ts` |
| AC-15 | `refreshes the favicon of a saved tab` | `tests/shared/links/LabelCommands.test.ts` |
| AC-16 | `manual` | checklist of T11 |

`AC-1`, `AC-2` and `AC-16` stay `manual`: a restart, the look of the result and a sync between two
computers cannot be read by a lab scenario (the lab profile has no bookmarks, no Favorites folder and one
computer). `AC-11` is a comparison with the recording. No `live:` check, so no scenario is owed by this
spec.

Further tests, named freely: the store (`LinkLabels.test.ts`: set and read, a `name` removal keeps the
icon, an entry with nothing left is dropped, the two keys, two modules see each other's change, a `failed`
save is returned, a newer or damaged value is read as the guard says, a refused favicon, copy, `fromSync`
is flagged); the symbols (24, unique ids, non-empty paths); `LabelIcon`; `EmojiCatalog` (eight
categories in order, keyword and name match, every word needed, empty search gives none, a missing file
gives an empty catalog and one warning); `InPlaceEditor` (selected text, Enter, blur saves, Escape,
a second edit cancels the first, `reposition`, `no-drag`); the picker (Reset and Refresh resolve their
result, Escape and a click outside resolve `null`, a symbol and an emoji resolve their icon, `tabs:
['icons']` has no emoji tab, no `refresh` means no Refresh button, a catalog that fails leaves the
`Icons` tab); `FaviconReader` (each plan of the design with fakes, none gives null, a non-web address,
too long a `data:` result); the rows and tiles (the name wins over the title of a tab that navigated away,
an unknown symbol draws the favicon, a stored `favicon` is drawn, a label change redraws); the menu order
(`LinkMenuItems.test.ts` with and without the two slots; `TileLinkCommands` with the items in group 2 and
alone for a pinned-tab tile, none for a tile with no key); the duplicate copies the label; `LabelSync`
(out for a row, a tile and a pinned-tab tile; in applies a name by `uuid` (and by address key for a pinned-tab tile) and removes on `null`;
a name applied by sync is not written back; a bookmark with no `uuid` is skipped).

## Risks

- **Sync keyed by address.** Two links with one address share a name through the sync store; two computers
  that rename one link race on one key (the last write wins). The icon and the favicon are not synced
  (out of scope): the name of a link can arrive while its icon is the favicon.
- **Cannot be proven in the lab.** Whether a bookmark field exists (plan A), the favicon plans (T1 F-4 to
  F-6 decide what can be proven, and the refresh on a real site is checked by Tore), and the sync between
  two computers (AC-16).
- **Pinned tiles.** The key is the address of the own page, so a pinned tab whose own page is not
  `http` or `https` has no label, and a tile whose tab is unpinned and pinned again keeps its label
  by address.
- **A redraw while typing.** The field is outside the rows, so it survives a redraw; its anchor may be a
  new element, which `reposition()` handles; if the anchor is gone the edit is cancelled.
- **Picker weight.** About 1,400 buttons, drawn once and kept. If a probe on Debian shows lag, the grid
  is cut by category and drawn when scrolled to.
- **Shared files unused until T6.** Described above; the feature branch is merged to `main` only after T6.
- **The emoji data license.** The source and its license are named in the pull request of T3; the data
  is CLDR (Unicode License) or MIT, both compatible with the repository.
