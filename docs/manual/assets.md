# Images and GIFs

[Back to the manual](README.md)

This page lists the graphic assets of the manual, where each one comes from, and the recordings of
VivArcDi that still have to be made on a real Vivaldi.

## What is here

| File | Kind | Shows | Used in |
|---|---|---|---|
| `images/diagrams/feature-map.svg` | Diagram | Available, in progress and proposed features | [Manual](README.md) |
| `images/diagrams/how-it-works.svg` | Diagram | Install, files in Vivaldi, start, re-apply after updates | [Manual](README.md) |
| `images/mockups/tab-bar-anatomy.png` | Mockup | The sections of the tab bar, numbered | [Manual](README.md), [Tab bar](tab-bar.md) |
| `images/mockups/folder-panel-and-peek-out.gif` | Mockup | Folder panel on hover, then the link below its closed folder | [Tab bar](tab-bar.md#folder-panel) |
| `images/mockups/pinned-tab-reset.gif` | Mockup | Pinned tab away from its page, back arrow, back home | [Tab bar](tab-bar.md#pinned-tabs) |
| `images/mockups/peek.gif` | Mockup | Shift+click opens Peek with Close, Expand, Split | [Peek](peek.md) |
| `images/mockups/today-archive.png` | Mockup | Archive panel grouped by day | [Today](today-and-keyboard.md#today-archive) |
| `images/mockups/copy-url.png` | Mockup | The "Copied" toast | [Today](today-and-keyboard.md#copy-url) |
| `images/mockups/little-arc.png` | Mockup | A Little Arc window | [Little Arc](little-arc.md) |
| `images/mockups/incognito.png` | Mockup | The incognito tab bar | [Incognito](incognito.md) |
| `images/mockups/peek-split.gif` | Mockup | Peek from a pinned tab, then Split | [Peek](peek.md) |
| `images/mockups/sidebar-look.gif` | Mockup | Row hover, then the palettes powder, lagoon and arclight | [Tab bar](tab-bar.md#the-arc-look) |
| `images/mockups/drag-tab-to-favorites.gif` | Mockup | A Today tab dragged into the Favorites (spec 020) | [Roadmap](roadmap.md#drag-a-tab-into-the-favorites) |
| `images/mockups/theme-color.gif` | Mockup | Edit Theme Color with three colors (spec 019) | [Roadmap](roadmap.md#theme-color-per-space) |
| `images/arc/arc-pinned-and-space-menus.gif` | Arc reference | Pinned tab menu and space menu | [Roadmap](roadmap.md#rename-pinned-tabs) |

**Mockups** are drawn in HTML and are not screenshots. Their source is
[`images/mockups/source/mockups.html`](images/mockups/source/mockups.html): open it with a scene in
the address, for example `mockups.html#{"scene":"peek","step":3}`, and take a 1000 × 620 screenshot.
The scenes are `anatomy`, `peek` (steps 0 to 4), `peeksplit` (0 to 3), `pinned` (0 to 3), `folder`
(0 to 3), `dragfav` (0 to 2), `themecolor` (0 to 3, with `bg` and `dot` colors), `look` (with `bg`,
`hover` and `cur`), `archive`, `littlearc`, `incognito` and `copyurl`.

The **Arc reference** clip is cut from Tore's screen recording of Arc of 2026-10-28, 800 px wide, 4
frames per second.

## Recordings still to make

A mockup explains the idea; a recording of the real thing convinces. These GIFs can only be recorded on
a Vivaldi with VivArcDi installed. Each line gives the file name to use, so the mockup or the Arc clip
can be swapped for it.

| # | File | Record this | Replaces |
|---|---|---|---|
| 1 | `vivarcdi/tab-bar-tour.gif` | Whole tab bar at rest, then hover a Favorite, a folder and a pinned tab | `tab-bar-anatomy.png` |
| 2 | `vivarcdi/favorites.gif` | Click three tiles, middle click one to unload it (it dims), click it again | new |
| 3 | `vivarcdi/pinned-tab-reset.gif` | In a pinned tab follow a link on the same site, the icon becomes ↩, click it | `pinned-tab-reset.gif` |
| 4 | `vivarcdi/peek.gif` | Shift+click a link, scroll inside Peek, click Expand | `peek.gif` |
| 5 | `vivarcdi/peek-split.gif` | From a pinned tab click a link to another site, then Split | `peek-split.gif` |
| 6 | `vivarcdi/folders.gif` | Open a folder, open a link, close the folder: the link stays below it | new |
| 7 | `vivarcdi/folder-panel.gif` | Rest on a closed folder, type in the search field, Enter | `folder-panel-and-peek-out.gif` |
| 8 | `vivarcdi/edit-folders.gif` | `+` on the space header, type a name, drag a tab into the new folder | new |
| 9 | `vivarcdi/copy-bookmarks.gif` | Drag a folder from the Bookmarks panel onto the workspace folders | new |
| 10 | `vivarcdi/space-header.gif` | Click the space header to collapse and expand; switch workspace | new |
| 11 | `vivarcdi/today-archive.gif` | Cmd/Ctrl+Shift+A, search, reopen a tab; then Clear on the separator | `today-archive.png` |
| 12 | `vivarcdi/copy-url.gif` | Cmd/Ctrl+Shift+C with the toast | `copy-url.png` |
| 13 | `vivarcdi/little-arc.gif` | Cmd+Opt+N, type a site, Move to workspace | `little-arc.png` |
| 14 | `vivarcdi/little-arc-external.gif` | Click a link in Mail or Notes: it opens in Little Arc | new |
| 15 | `vivarcdi/incognito.gif` | Open a private window, New Tab, Clear | `incognito.png` |
| 16 | `vivarcdi/installer.gif` | macOS: open VivArcDi.app, Install, tick the shortcuts box | new |
| 17 | `vivarcdi/sidebar-look.gif` | Once spec 028 is done: the tab bar in two palettes | `sidebar-look.gif` |

Tips for the recordings:

- On macOS use Cmd+Shift+5 and record only the Vivaldi window; keep each clip under 15 seconds.
- Use a test workspace with neutral sites, without personal tabs, mail or accounts in view.
- Put the `.mov` files in the project files; the conversion to GIF is done with ffmpeg:
  `ffmpeg -i in.mov -vf "fps=8,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse" out.gif`.
