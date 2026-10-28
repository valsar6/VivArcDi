# 004 Today tabs and keyboard: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

## Approach

Two new modules, so that each can be turned off alone: `today-archive` (FR-1 to FR-5) and `copy-url`
(FR-6). Both follow the patterns already in the code base: `chrome.tabs` through `BrowserTabs`, the
shared `PersistentStorage` for saved data, `TabData` for `vivExtData`, `PageScriptInjector` and a page
script for shortcuts pressed while the page has focus, and `-webkit-app-region: no-drag` on every
element added to the tab bar (NFR-3).

1. **Last active time (FR-1, AC-3, AC-4).** Tab ids change when Vivaldi restarts, so the time cannot be
   kept by id. `ActivityStamps` writes it into the tab itself, under VivArcDi's own key of `vivExtData`
   (`lastActive`, milliseconds), which Vivaldi saves with the session. A tab is stamped when it stops
   being the active tab of its window (the user viewed it until then), when it is created, and, at
   start, every active tab. A tab without a stamp is stamped on first sight instead of being archived.
   `ActivityClock` reads the last active time of a tab as the larger of the stamp and Chromium's
   `lastAccessed`, so the time Vivaldi was closed counts (AC-4).
2. **Who is a Today tab (FR-2, AC-2).** `TodayTabPolicy` is pure: a tab is archivable when it is not
   pinned (Favorites are pinned tabs since 003), not in a tab stack (`vivExtData.group`), not the active
   tab of its window, not audible, and its address is `http`, `https` or `file`. A tab opened from a
   009 folder is a Today tab, as Tore decided.
3. **Sweep (FR-2, AC-1, AC-12).** `ArchiveSweeper` runs a minute after start and then once a minute: it
   queries every tab, keeps those the policy accepts and whose last active time is older than
   `archiveAfterHours`, saves each to the archive and then closes it. If saving fails, the tab stays
   open. When the module is disabled nothing is constructed, so no tab can be closed (NFR-2).
4. **Archive (FR-3, AC-5, AC-8, NFR-1).** `ArchiveStore` keeps entries (`url`, `title`, `favIconUrl`,
   `workspace`, `archivedAt`) newest first under `vivarcdi.archive` in the shared `PersistentStorage`,
   which reaches `chrome.storage.local`. Past `archiveLimit` the oldest are dropped. Malformed entries
   are skipped on load and logged once.
5. **Restore (FR-4, AC-6).** `ArchiveRestorer` creates the tab with the entry's address, writes the
   entry's workspace into its `vivExtData` and activates it, then removes the entry. Creating a tab in a
   workspace is the step 009's `LinkActivator` already does; it moves to `src/core/WorkspaceTabs.ts`
   with a `workspace` argument, and `LinkActivator` calls it.
6. **Panel (FR-4, AC-9, AC-10).** `ArchivePanelView` is a popover drawn over the tab bar, styled like
   the folder panel of 008: a search field with focus, then groups by day ("Today", "Yesterday", then
   the date), each row with favicon, title, host and time. Up and down move the selection, Enter
   restores, Escape or a click outside closes. `ArchiveGroups` (by day) and `ArchiveSearch` (case
   insensitive, title or URL contains the text) are pure, so AC-9 is tested without a DOM. The header
   of the panel also has "Archive Today tabs", the action of step 7, for workspaces without pinned tabs.
7. **Clear (FR-5, AC-7).** The separator is already drawn by 003 under the last pinned row
   (`data-vivarcdi-pinned-last`). `ClearButton` puts a small "Clear" button inside that row, shown when
   the pointer is over the separator, and puts it back when Vivaldi rebuilds the row (one check per
   frame through `FrameTask`). One delegated click listener on the document handles it. The click
   archives, now and without the time limit, every Today tab of the active tab's workspace except the
   active one. Without the `pinned-tabs` module there is no separator, and the panel action of step 6
   remains.
8. **Archive button (FR-4, AC-10).** `ArchiveButton` adds a button at the bottom of the tab bar, after
   the tab list, in a footer element owned by VivArcDi. Its exact place is checked with a probe on
   Tore's Vivaldi before the view is finished (task T2).
9. **Shortcuts (FR-4, FR-6, AC-10, AC-11).** `ShortcutKeys` (pure) recognizes Cmd+Shift+A and
   Cmd+Shift+C on macOS, Ctrl+Shift+A and Ctrl+Shift+C elsewhere. Each module listens in the capture
   phase on the interface document and, through `PageScriptInjector`, injects a page script into every
   tab (`archive-keys.js`, `copy-keys.js`) that forwards its key to the interface with a token, as
   `pinned-keys` does. Handled keys are prevented, so Vivaldi's binding on them, if any, does not run.
10. **Copy and toast (FR-6, AC-11).** `UrlCopier` reads the active tab's address and writes it with
    `navigator.clipboard.writeText`; when the interface refuses, it falls back to a hidden text field
    and `document.execCommand('copy')`. `Toast` shows "Copied" at the bottom of the window for two
    seconds, with `role="status"`; a second copy restarts the timer instead of stacking toasts. On a
    failure the toast says "Copy failed" and the error is logged.

Rejected alternatives:

- **Vivaldi's "recently closed" as the archive**: it drops the workspace and mixes in tabs closed by
  hand (Tore, 2026-10-28).
- **Last active times by tab id in storage**: ids change at every restart, so the time Vivaldi was
  closed would be lost.
- **Only Chromium's `lastAccessed`**: whether Vivaldi restores it after a restart is unverified; it is
  read, but the own stamp is the source that is known to survive.
- **Quick Commands entry or Vivaldi command chains**: a mod cannot add to Quick Commands, and a command
  chain cannot call VivArcDi. Chains stay an option for later (Tore, 2026-10-28).
- **Drawing the separator inside Vivaldi's tab list**: the list is rebuilt often; reusing 003's marked
  row keeps one separator.

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/core/WorkspaceTabs.ts` | Create a tab in a given workspace; moved out of 009's `LinkActivator` | |
| `src/core/TabData.ts` | Own key gains `lastActive` (number) | Adapter |
| `src/core/ShortcutKeys.ts` | Pure: is a key event Cmd/Ctrl+Shift+letter for this platform | |
| `src/modules/today/ActivityStamps.ts` | Stamps tabs on deactivation, creation and start (AC-3) | Observer |
| `src/modules/today/ActivityClock.ts` | Pure: last active time from stamp and `lastAccessed` (AC-4) | |
| `src/modules/today/TodayTabPolicy.ts` | Pure: which tabs may be archived (AC-2) | Specification |
| `src/modules/today/ArchiveSweeper.ts` | Periodic sweep and "Clear" (AC-1, AC-7) | Command |
| `src/modules/today/ArchiveStore.ts` | Entries, limit, load and save (AC-5, AC-8) | Repository |
| `src/modules/today/ArchiveRestorer.ts` | Reopen an entry in its workspace (AC-6) | Command |
| `src/modules/today/ArchiveGroups.ts`, `ArchiveSearch.ts` | Pure: groups by day, search (AC-9) | |
| `src/modules/today/ArchivePanelView.ts` | Popover, keyboard, one delegated listener | |
| `src/modules/today/ClearButton.ts` | Button on the separator, put back after rebuilds | |
| `src/modules/today/ArchiveButton.ts` | Footer button at the bottom of the tab bar | |
| `src/modules/today/TodayArchive.ts` | Module: options, wiring, clean stop | Facade |
| `src/modules/copyurl/UrlCopier.ts` | Clipboard write with fallback | Strategy |
| `src/modules/copyurl/Toast.ts` | One toast at a time, two seconds | |
| `src/modules/copyurl/CopyUrl.ts` | Module: shortcut, injector, clean stop | Facade |
| `src/page/archive-keys.ts`, `src/page/copy-keys.ts` | Forward the shortcut from the page | |
| `src/styles/today.scss`, `src/styles/toast.scss` | Panel, buttons, toast, theme colors, no-drag | |

## Vivaldi interface

| What | Use | IF missing or failing |
|---|---|---|
| `chrome.tabs` `query`, `remove`, `create`, `update`, `onActivated`, `onCreated` | Stamps, sweep, restore | Module stays off, logged |
| `tab.audible`, `tab.pinned`, `tab.lastAccessed` | Policy and clock | `lastAccessed` missing: the stamp alone |
| `vivExtData.workspaceId`, `vivExtData.group` | Workspace of entries; stacks | No workspace: restored in the current one |
| `data-vivarcdi-pinned-last` from 003 | Place of "Clear" | Only the panel action |
| Selector `tabsContainer` (`#tabs-container`), new | Footer with the archive button | Button missing, shortcut still works |
| `navigator.clipboard` in `window.html` | Copy | `execCommand('copy')`, then "Copy failed" |
| Marks: `data-vivarcdi-archive`, `data-vivarcdi-clear`, `data-vivarcdi-toast` | Styles | |

Uninstalling VivArcDi leaves the archive in `chrome.storage.local` and the `lastActive` stamps in the
tabs; both are ignored by Vivaldi.

## Configuration

```json
"today-archive": {
  "enabled": true,
  "archiveAfterHours": 12,
  "archiveLimit": 500
},
"copy-url": {
  "enabled": true,
  "toastMs": 2000
}
```

`archiveAfterHours` is clamped to 1 to 720 (30 days), `archiveLimit` to 50 to 5000.

## Risks

| Risk | Mitigation |
|---|---|
| A tab is closed that the user wanted | Never the active, audible, pinned or stacked tab; every closed tab is in the archive first; the module can be disabled |
| The first start after installing archives many old tabs at once | Tabs without a stamp are stamped on first sight, so the first sweep that can close them runs after `archiveAfterHours` |
| Writing `vivExtData` on every tab switch wakes the other modules | Only the tab that is left is written, once per switch; 003 already writes `vivExtData` |
| `vivExtData.group` is not the stack key in Vivaldi 8.2 | Probe in T2 reads a stacked tab's `vivExtData`; manual check AC-7 |
| A restored tab in another workspace does not switch to it | Manual check AC-6; fallback is to restore in the current workspace |
| The clipboard is refused in `window.html` | `execCommand` fallback, then a "Copy failed" toast; manual check AC-11 |
| The footer overlaps Vivaldi's own buttons at the bottom | Probe in T2 before T10 |
