# 008 Folder hover preview: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

## Approach

A new module, `folder-preview`, watches the rows that [009](../009-bookmark-folders-in-tab-bar/design.md)
draws and opens a panel next to the tab bar when the pointer rests on a closed folder. It does not
depend on the code of 009, only on its marks (`data-vivarcdi-folder-id` on every folder row,
`data-vivarcdi-open` on the open ones), so it works for the folders of the first level and for the
subfolders alike (spec 009 asks for both).

1. **Hover (FR-1, FR-6, AC-5, AC-6, AC-8).** `FolderHover` listens to `mouseover` and `mouseout` on the
   document and uses `closest('[data-vivarcdi-folder-id]')`, so it keeps working when 009 redraws its
   rows. After `hoverDelayMs` on a closed folder row it asks for the panel; leaving both the row and
   the panel closes it after the same delay; a click on the row (which opens it) or Esc closes it at
   once. Rows with `data-vivarcdi-open` never start it.
2. **What the folder holds (FR-2, NFR-2).** `FolderLinks` reads the bookmark tree when the panel opens,
   finds the folder by id and lists its web links with the rules of 009 (`FolderTree.build` and
   `FolderTree.links`), so a folder shows the links of its subfolders too, in folder order.
   Nothing is cached: the tree is read again at every opening, so renamed and moved bookmarks are
   current without listening to bookmark events.
3. **Dates (FR-2, FR-3, AC-1, AC-2).** The records of [007](../007-reopen-pinned-tabs/design.md) are in the
   shared `PersistentStorage` of the modules (`chrome.storage.local`, key `vivarcdi.lastOpened`, address keys to times). A new `LastOpenedStore`
   is loaded at every opening, so dates recorded since the last opening are seen.
   `PreviewRows` sorts: recorded links by time, newest first, then the unrecorded ones in folder
   order, which read "never opened". `RelativeTime` writes the time with `Intl.RelativeTimeFormat` in
   the language of the interface (`document.defaultView.navigator.language`).
4. **Search and keys (FR-4, FR-5, AC-3, AC-4).** `PreviewSession` is the state of an open panel and has
   no DOM: the text typed, the rows left by the filter (title or address contains the text, ignoring
   case), the highlighted row, and `move`, `activate`. The panel opens with the first row
   highlighted; Up and Down wrap at the ends; typing resets the highlight to the first row.
5. **View (NFR-1, AC-5).** `PreviewPanelView` builds the panel with `createElement`: a search field
   with the placeholder `Search <folder>…` in the interface language when known, and the list with favicon,
   title and time. It is a child of `#browser`, `position: fixed`, with its left edge at the right
   edge of the tab bar (the left edge of the bar when the bar is on the right), its top aligned with
   the folder row and moved up when it would pass the bottom of the window. It takes the focus
   of the search field when it opens.
6. **Activate (FR-5, AC-4, AC-7).** `FolderPreview` calls the `LinkActivator` of 009 (switch to the open
   tab of the link or open a new one in the current workspace) and closes the panel. The activator needs
   to know the open tabs: an `OpenLinks` is refreshed just before the call, without listening to tab
   events, since nothing else here needs them.

Rejected alternatives:

- **Reading the tree from the module of 009** (a shared instance): modules do not share instances, and
  the marks already say what is needed.
- **Showing only the direct links of a folder:** a folder such as Hobbies keeps most of its links in
  subfolders, so the panel would look empty; flat with search works for finding a link, which is the
  point of the panel. Subfolders are not separate rows.
- **A native Vivaldi popup or menu:** none can hold a search field and a list with dates.
- **Keeping the dates in memory:** `ActivationRecorder` already saves them; reading the same
  storage keeps one source.

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/modules/folderpreview/RelativeTime.ts` | Time since a date as text in a language (AC-1) | Value object |
| `src/modules/folderpreview/PreviewRows.ts` | Pure: links and dates to sorted rows (AC-2) and filtered rows (AC-3) | |
| `src/modules/folderpreview/PreviewSession.ts` | Text, filtered rows, highlight, `activate` (AC-4) | State |
| `src/modules/folderpreview/FolderLinks.ts` | Links of a folder by id, from the bookmark tree | Adapter |
| `src/modules/folderpreview/FolderHover.ts` | Delays, rest and leave on folder rows | Observer |
| `src/modules/folderpreview/PreviewPanelView.ts` | Panel DOM, position, keyboard and click | |
| `src/modules/folderpreview/FolderPreview.ts` | Module: options, wiring, clean stop | Facade |
| `src/styles/folder-preview.scss` | Panel, rows, highlight, theme colors | |

Reused without change: `LastOpenedStore`, `AddressKey`, `LinkActivator`, `OpenLinks`, `FolderTree`,
`BrowserBookmarks`. `LinkActivator` and `OpenLinks` stay in `src/modules/folders`.

## Vivaldi interface

| What | Use | IF missing or failing |
|---|---|---|
| `data-vivarcdi-folder-id`, `data-vivarcdi-open` on the rows of 009 | Where to hover | No row, no panel |
| `chrome.bookmarks.getTree` | Links of a folder | No panel, logged (NFR-2) |
| `chrome.tabs` | Activating a link | No panel, logged |
| Selector `tabBar` (exists) | Where the panel is placed | Panel at the left edge of the window |
| `PersistentStorage` key `vivarcdi.lastOpened` | Dates | All links read "never opened" |
| `chrome://favicon/` in the interface | Icon of a link | First letter, as in 009 |

## Configuration

```json
"folder-preview": { "enabled": true, "hoverDelayMs": 400 }
```

`hoverDelayMs` is clamped to 100 to 2000. The module needs `bookmark-folders` to be on; without it there
are no folder rows and nothing happens.

## Risks

| Risk | Mitigation |
|---|---|
| With the sidebar set to auto-hide, moving the pointer from the folder to the panel hides the bar and the folder row with it | The panel does not depend on the row once open; it closes on its own leave, Esc or activation. Manual check AC-6 with auto-hide |
| Vivaldi shortcuts react to the keys typed in the search field | Key events in the field stop at the panel; manual check of typing letters and Esc |
| The panel opens while a drag or a click is in progress | Hover is ignored while a mouse button is pressed |
| A folder with hundreds of links makes the panel slow | At most 100 rows are drawn at once and the search narrows them; the filter works on the whole list |
| The language of the interface is not the language of the text the user expects | `Intl.RelativeTimeFormat` follows `navigator.language` of the interface; "never opened" and the placeholder have Italian and English texts and English is the fallback |
