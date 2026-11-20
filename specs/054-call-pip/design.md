# 054 Call Picture in Picture: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

The first design (PiP opened by the interface on tab switch) was withdrawn with its spec on
2026-11-20. The design of the shortcut version is written after Tore approves the new spec; what the
probes found, which it builds on, is kept here.

## Probe results (T1, lab Vivaldi 8.1, 2026-11-20)

Run on a page served from `127.0.0.1` (a secure context) with a live video track from a canvas.

- `requestPictureInPicture()` called from `executeScript` fails with `NotAllowedError: Must be handling
  a user gesture`. The interface-driven way (2) cannot open PiP by itself: it is closed.
- A handler for `enterpictureinpicture` registers without error, both from the page and from the
  `executeScript` world. Leaving the tab (`hidden` becomes `true`) did not open PiP, and returning
  left no window to close.
- That negative is not conclusive: Chromium opens automatic PiP only for a tab that captures camera or
  microphone (or shares the screen) and has the site permission. The probe's video came from a canvas,
  and the lab cannot grant camera access. Vivaldi exposes no `autoPictureInPicture` content setting
  (`chrome.contentSettings` has none) and no PiP key in `vivaldi.tabsPrivate`, so the module cannot
  grant the permission either.
- `chrome.settingsPrivate` and `vivaldi.prefs.getAll` are not available to the probe, so the site
  permission could not be read.

What this leaves: way (1) is the only way, and whether it works depends on Vivaldi honoring the action
for a call tab. The check that decides it is a real Meet call (task T1b). If Vivaldi does not open PiP
there, no gesture-less path exists and spec 054 has to change (a new decision for Tore), not the
design.

Follow-up, 2026-11-20:

- Tore joined a real Meet call in his Vivaldi and switched tab: no PiP opened. Way (1) does not work
  with the default settings.
- `chrome.scripting.executeScript`, in the isolated and in the main world, fails with the same
  `NotAllowedError`: the interface has no user gesture to lend to a page. Vivaldi itself uses it only
  to exit PiP (`exitPictureInPicture` in `bundle.js`, 8.3).
- Vivaldi 8.3's `bundle.js` has a per-site setting "Automatic Picture-in-picture"
  (`auto-picture-in-picture`) and a Vivaldi command `DOCUMENT_PICTURE_IN_PICTURE` that only works on
  videos. Neither is exposed to modules. What is open: whether that site setting, set to Allow for
  `meet.google.com`, makes Chromium invoke the action (T1b).

- Second real Meet check, 2026-11-20: with "Automatic Picture-in-picture" set to Allow for
  `meet.google.com`, switching tab still opens no PiP. Vivaldi does not invoke the media session action
  on tab switch. Way (1) is closed too; no gesture-less way to open PiP is left.
- `DOCUMENT_PICTURE_IN_PICTURE` is an item of the video context menu, run by the browser on the video
  under the right click; a module cannot call it.

What the design will use: the page script of `copy-keys` as the model (a key listener in the page with
a real gesture), `requestPictureInPicture()` from that listener, `document.exitPictureInPicture()`
from the interface on tab activation (Vivaldi itself closes PiP that way), and the interface side of
the first design reduced to closing: a registry of which tab has a call and an open window, and
`PageScriptInjector.send(tabId, code)`.
