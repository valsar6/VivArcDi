# Images and GIFs

[Back to the manual](README.md)

This page lists the graphic assets of the manual, where each one comes from, the recordings made on
a real Vivaldi, and the few that still have to be made.

## What is here

| File | Kind | Shows | Used in |
|---|---|---|---|
| `images/diagrams/feature-map.svg` | Diagram | Available, in progress and proposed features | [Manual](README.md) |
| `images/diagrams/how-it-works.svg` | Diagram | Install, files in Vivaldi, start, re-apply after updates | [Manual](README.md) |
| `images/vivarcdi/before-after.gif` | Recording | Stock Vivaldi and the same page with VivArcDi alternate | [Manual](README.md), [README](../../README.md) |
| `images/vivarcdi/tab-bar-tour.gif` | Recording | The tab bar at rest, then hovering a Favorite, a folder and a pinned tab | [Manual](README.md), [Tab bar](tab-bar.md) |
| `images/vivarcdi/favorites.gif` | Recording | Three tiles clicked, one unloaded with a middle click, then loaded again | [README](../../README.md), [Tab bar](tab-bar.md#favorites) |
| `images/vivarcdi/folders.gif` | Recording | A folder opened, a link clicked, the folder closed with the link row below it | [Tab bar](tab-bar.md#folders) |
| `images/vivarcdi/folder-panel.gif` | Recording | A closed folder shows its panel, search narrows it, Enter opens a link | [Tab bar](tab-bar.md#folder-panel) |
| `images/vivarcdi/edit-folders.gif` | Recording | `+` on the space header, the folder named, a tab dragged onto it | [Tab bar](tab-bar.md#folders) |
| `images/vivarcdi/copy-bookmarks.gif` | Recording | A folder dragged from the Bookmarks panel onto the folder rows | [Tab bar](tab-bar.md#folders) |
| `images/vivarcdi/pinned-tab-unload.gif` | Recording | A pinned tab following a link, unloaded with the minus, reopened on its pinned page | [Tab bar](tab-bar.md#pinned-tabs) |
| `images/vivarcdi/space-header.gif` | Recording | The header collapses and expands the folders; the workspace menu switches workspace | [Tab bar](tab-bar.md#space-header) |
| `images/vivarcdi/peek.gif` | Recording | Shift+click opens Peek, the page scrolls inside it, then Expand | [Peek](peek.md) |
| `images/vivarcdi/peek-split.gif` | Recording | Peek from a pinned tab, then Split side by side | [Peek](peek.md) |
| `images/vivarcdi/today-archive.gif` | Recording | Archive grouped by day, search, reopen an entry, Clear | [Today](today-and-keyboard.md#today-archive) |
| `images/vivarcdi/copy-url.gif` | Recording | The "Copied" toast | [Today](today-and-keyboard.md#copy-url) |
| `images/vivarcdi/little-arc.gif` | Recording | The command bar, the Little Arc window, an edited address | [Little Arc](little-arc.md) |
| `images/vivarcdi/incognito.gif` | Recording | A private window with the incognito bar, New Tab and Clear | [Incognito](incognito.md) |
| `images/mockups/sidebar-look.gif` | Mockup | Row hover, then the palettes powder, lagoon and arclight | [Tab bar](tab-bar.md#the-arc-look) |
| `images/mockups/drag-tab-to-favorites.gif` | Mockup | A Today tab dragged into the Favorites (spec 020) | [Favorites](tab-bar.md#favorites) |
| `images/mockups/theme-color.gif` | Mockup | Edit Theme Color with three colors (spec 019) | [Roadmap](roadmap.md#theme-color-per-space) |
| `images/mockups/pinned-and-space-menus.gif` | Mockup | Pinned tab menu and space header menu (specs 019, 026, 027) | [Roadmap](roadmap.md#rename-pinned-tabs) |

**Mockups** are drawn in HTML and are not screenshots. Their source is
[`images/mockups/source/mockups.html`](images/mockups/source/mockups.html): open it with a scene in
the address, for example `mockups.html#{"scene":"peek","step":3}`, and take a 1000 × 620 screenshot.
The scenes are `anatomy`, `peek` (steps 0 to 4), `peeksplit` (0 to 3), `pinned` (0 to 3), `folder`
(0 to 3), `dragfav` (0 to 2), `themecolor` (0 to 3, with `bg` and `dot` colors), `look` (with `bg`,
`hover` and `cur`), `menus` (0 to 5), `archive`, `littlearc`, `incognito` and `copyurl`.

## Recordings still to make

A mockup explains the idea; a recording of the real thing convinces. These GIFs can only be recorded on
a Vivaldi with VivArcDi installed. Each line gives the file name to use, so the mockup or the Arc clip
can be swapped for it.

| # | File | Record this | Replaces |
|---|---|---|---|
| 1 | `vivarcdi/little-arc-external.gif` | Click a link in Mail or Notes: it opens in Little Arc | new |
| 2 | `vivarcdi/installer.gif` | macOS: open VivArcDi.app, Install, tick the shortcuts box | new |
| 3 | `vivarcdi/sidebar-look.gif` | Once spec 028 is done: the tab bar in two palettes | `sidebar-look.gif` |

Tips for the recordings:

- On macOS use Cmd+Shift+5 and record only the Vivaldi window; keep each clip under 15 seconds.
- Use a test workspace with neutral sites, without personal tabs, mail or accounts in view.
- Put the `.mov` files in the project files; the conversion to GIF is done with ffmpeg:
  `ffmpeg -i in.mov -vf "fps=8,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse" out.gif`.
