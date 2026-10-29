# Native settings

Much of Arc already exists in Vivaldi. Configure these settings first: they need no mods and survive
every update. Labels refer to Vivaldi 8.1 and may differ slightly in other versions.

## Sidebar instead of a tab bar

| Arc | Vivaldi setting |
|---|---|
| Vertical sidebar on the left | Settings > Tabs > Tab Bar Position: **Left** (or the **Vertical Left** layout preset) |
| Sidebar that hides and reappears at the edge | The **Auto Hide** layout preset, or Settings > Appearance > auto-hide the UI |
| Compact URL at the top of the sidebar | Settings > Address Bar: move the address bar into the tab bar area (Custom Tab Bar, 7.8+) |
| Page in a rounded frame | Settings > Themes: a theme with a full-window background, transparency and blur (8.0+) |

## Spaces

| Arc | Vivaldi setting |
|---|---|
| Spaces | **Workspaces**, with a name and an icon or emoji each |
| Space switcher | Show workspaces at the top of the tab bar |
| Links that open in a given Space (Air Traffic Control) | Workspace rules for sites |

## Favorites and pinned tabs

| Arc | Vivaldi setting |
|---|---|
| Favorites shared by every Space | No native equivalent: Vivaldi 8.2 cannot show one tab in every workspace. VivArcDi draws them from a bookmark folder ([spec 003](../specs/003-pinned-tabs-and-folders/spec.md)) |
| Pinned tabs of one Space | Pinned tabs in that workspace |
| Pinned tab that keeps its site | Lock the pinned tab to its domain (7.8+) |
| Folders | **Tab stacks**, shown as **accordion** in the vertical tab bar; colors from 7.5, drag-and-drop from 7.8 |

## Today tabs and archive

| Arc | Vivaldi setting |
|---|---|
| Inactive tabs unloaded | Settings > Tabs > **Tab Hibernation**: hibernate background tabs after a delay |
| Auto-archive after 12 hours | Not native; planned for phase 4 |

## Keyboard

| Arc | Vivaldi setting |
|---|---|
| Command Bar (Cmd/Ctrl+T) | **Quick Commands**; bind it to Cmd/Ctrl+T in Settings > Keyboard, or run `python3 installer shortcuts apply`, which also turns on "Open Links In New Tab" and moves Tab Bar, Pin / Unpin Tab and Print to Cmd/Ctrl+S, D and P ([spec 014](../specs/014-arc-shortcuts/spec.md)) |
| Ctrl+Tab in recent order | Settings > Tabs > Tab Cycling: **recently used order** |
| Copy URL (Cmd/Ctrl+Shift+C) | Ships with VivArcDi (`copy-url`); leave the shortcut unbound in Vivaldi |
| Split View | **Tab Tiling**, and "Open link as split tab" (7.8+) |

## Still missing

The Favorites icon grid, Peek, bookmark folders in the tab bar and pinned tabs that unload on
Cmd/Ctrl+W and reset to their own page ship with VivArcDi (see the README), and so do the Today
archive and copy URL with a toast.

Some setting names above come from release notes rather than the 8.1 interface itself. If one does not
match, open an issue with the label you see.
