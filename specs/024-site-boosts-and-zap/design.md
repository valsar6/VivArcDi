# 024 Site boosts and zap: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

Written after the spec was approved on 2026-11-08. It says **how**; the spec says **what**.

## Approach

Two halves: a store with the rules of each host, and two places that use it: a content script that applies the rules
in every page, and a panel in `window.html` that edits them. Both talk through `chrome.storage.local`, which is shared (spec 011 facts).

1. **Store.** `BoostStore` keeps one record per host under `vivarcdi.boosts`: `{font, background, color, zapped: string[]}`. Reads and writes go through
   a `SerialTask` (as `TabDataWriter`), so two edits never overwrite each other (AC-3). Host key is the exact host name.
2. **Applying.** The content script (`boost-apply.js`, injected like the page scripts of Peek by `PageScriptInjector`) runs at `document_start`, reads the record
   for `location.hostname` and adds one `<style>` with the font and colors and `display: none !important` for each zapped selector.
   It listens to `chrome.storage.onChanged` so an edit shows at once.
3. **Zap.** The panel asks the active tab's script to enter picking mode (message). The script outlines the element under the pointer (`mouseover`, a fixed overlay,
   no change to the page), and on click sends the selector back. `SelectorBuilder` (pure, tested on a DOM) builds the shortest selector that matches exactly
   the clicked element: id if unique, else tag plus classes, else adds `:nth-child` on the way up until `querySelectorAll` returns one element (AC-4).
4. **Panel.** Opened by the menu item and Cmd/Ctrl+Shift+B. Font list (a fixed set of system fonts), two color inputs, Zap button, zapped list with Undo, Reset site.

Decisions on the open questions (Tore to confirm with the design): a changed page may break a selector; the panel shows a zapped row that matches nothing in grey so the user can remove it.
Boosts apply to the exact host only; `www.` is treated as the same host.

Rejected: `chrome.scripting` registration (not available to mods); custom JavaScript.

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/modules/boosts/BoostStore.ts` | Per host records | Repository |
| `.../Boosts.ts` | Module, shortcut, menu item | Module |
| `.../BoostPanel.ts` | Panel | View |
| `src/page/boost-apply.ts` | Applies rules in pages | Page script |
| `src/page/zap-picker.ts` | Picking mode | Page script |
| `src/page/SelectorBuilder.ts` | Shortest unique selector | Pure function |

## Vivaldi interface

Menu item through the page context menu if mods can add one; otherwise the shortcut only (T1 probe). Scripts go through `PageScriptInjector`.

## Configuration

`site-boosts`: `enabled` true, `shortcut` `mod+shift+b`, `fonts` list.

## Risks

| Risk | Mitigation |
|---|---|
| Content script runs after first paint | Hide with the stored CSS as early as `document_start` allows; accept a flash |
| A selector hides too much after a redesign | Grey row in the panel; Reset site |
| Sites with CSP block inline style | Use `adoptedStyleSheets`; fallback to the `style` attribute |
