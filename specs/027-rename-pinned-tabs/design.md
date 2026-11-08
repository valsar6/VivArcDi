# 027 Rename and re-icon pinned tabs: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

Written after the spec was approved on 2026-11-08. It says **how**; the spec says **what**.

## Approach

The pinned rows and the Favorites tiles are marked by their bookmark id. The name and icon live in the bookmark's `vivExtData`, written with the serialized
`TabDataWriter`/`BookmarkWriter` path of 009 (0.9.1 fix), so a restart keeps them (AC-1).

1. **Data.** `PinnedLabel` reads and writes `vivarcdi.label` (`{name?, icon?}`) in `vivExtData`. `rename` and `reset` never touch the URL (FR-3, AC-4).
2. **Menu.** A `contextmenu` listener on rows and tiles adds "Rename…", "Change icon…" and "Reset" to a small VivArcDi menu drawn at the pointer (a mod cannot extend Vivaldi's
   native menu). It replaces nothing: the native menu is opened with Shift+right click as before.
3. **Rename in place.** `LabelEditor` swaps the row title for an input, Enter saves, Esc cancels.
4. **Icon.** `EmojiGrid` is a fixed set of about 60 emoji. The chosen one replaces the favicon element with a text span.
5. **Display.** `PinnedRows` and `FavoritesView` call `PinnedLabel.read(bookmarkId)`; a stored value wins over the title and favicon (FR-2).
6. **Vivaldi's bookmarks panel** keeps the original title (answers the open question): the name belongs to VivArcDi rows only, so the bookmark stays recognizable in Vivaldi and in sync.

Rejected: changing the bookmark title (would change Vivaldi's own panel and sync).

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/core/PinnedLabel.ts` | Read, write, reset the label | Repository |
| `src/modules/pinned/LabelMenu.ts` | VivArcDi context menu | View |
| `src/modules/pinned/LabelEditor.ts` | In-place edit | View |
| `src/modules/pinned/EmojiGrid.ts` | Icon grid | View |

## Vivaldi interface

`vivExtData` key `vivarcdi.label`; rows keep their mark `data-vivarcdi-bookmark-id`. Menu and editor carry `-webkit-app-region: no-drag`.

## Configuration

`pinned-tabs.labels` true.

## Risks

| Risk | Mitigation |
|---|---|
| Concurrent `vivExtData` writes lose data | All writes go through the serialized writer |
| Row redraw removes the editor | Editor is attached to the row key, restored after a redraw |
