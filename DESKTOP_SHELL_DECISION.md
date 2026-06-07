# Harborline Desktop Shell Decision

Date: 2026-06-06
Status: accepted for the vertical slice

## Decision

Use Electron as Harborline's first production desktop shell.

The vertical-slice package should be an Electron app that loads the existing
Vite production build from `dist`, keeps the Pixi map on Chromium, and exposes
only a narrow preload bridge for app save/log/window operations. Tauri remains
deferred as a future package-size optimization, not a rejected technology.

## Why Electron Fits This Game Now

Harborline's release-sensitive surface is the animated Pixi/WebGL ocean. The
current verification stack already proves the game in Chromium through Vite
preview, Playwright, canvas-pixel probes, and browser smoke. Electron keeps the
packaged runtime closest to that evidence by bundling Chromium with the app.

Tauri is appealing because it makes smaller apps and uses the operating
system's native webview, but that is exactly the tradeoff we should defer until
after the vertical slice: native webviews add renderer variance while the ocean,
shader, canvas probe, low-power mode, and route-hit surfaces are still being
polished. A smaller package is valuable; a predictable game renderer is more
valuable right now.

Web-only local packaging is not enough. It does not satisfy the major goal that
a player can launch the game without terminal help, and it keeps saves tied to
browser storage rather than an app-owned path.

## Decision Matrix

| Option | Package size | GPU/rendering | Save path | Updates | Platform support | Maintenance | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Electron | Largest, because Chromium ships with the app | Best match to current Chromium smoke and Pixi evidence | Strong: main process owns `userData` and logs paths | Mature, but signing/notarization still gates trust | macOS-first, Windows next, Linux after installer work | All-JS/TS plus small main/preload surface | Choose for vertical slice |
| Tauri 2 | Much smaller by using system webview | Good in principle, but more OS/webview variance for Pixi/WebGL | Strong through app directories and FS plugin scopes | Strong, signed updater path available | Cross-platform, but Linux webview baselines matter | Adds Rust/toolchain/plugin permissions | Defer until renderer risk is lower |
| Web-only local app | Smallest/no shell | Same as browser, but not an app | Browser-local storage only | Manual only | Any browser | Simple, but not a desktop product | Reject for release candidate |

## Implementation Posture

Electron should be added as a thin host, not as a second application.

- Renderer: keep `src/App.tsx`, `src/MapScene.tsx`, and the Vite build as the
  game. No Node APIs in the renderer.
- Main process: own window lifecycle, app paths, file-backed save operations,
  runtime log writes, version/about metadata, and package identity.
- Preload: expose a tiny `window.harborlineDesktop` bridge with typed methods
  for save read/write/delete/recover/export/import, logs, version, and window
  commands. Do not expose raw `fs`, `ipcRenderer`, `path`, or shell access.
- Security: use `nodeIntegration: false`, `contextIsolation: true`, and a
  sandboxed renderer. Load only the local `dist/index.html` in production.
- Content: disable remote navigation from the game window. External links, if
  added later, must open through an explicit main-process allowlist.

## Save And Log Contract

`M-022` should move persistence behind an app-storage adapter with browser and
Electron implementations.

Electron storage target:

- Save directory: `path.join(app.getPath("userData"), "harborline-game")`.
- Primary save: `save.v2.json`.
- Backup save: `save.backup.v2.json`.
- Best score/settings: either `profile.v2.json` or clearly separated
  `best.v2.json` and `settings.v1.json`.
- Runtime log directory: Electron logs path via `app.setAppLogsPath()` and
  `app.getPath("logs")`.
- Error log: newline-delimited JSON, capped or rotated before it can grow
  without bound.

Browser storage should remain as a development fallback until the packaged
path is verified. The app should migrate a valid browser save into Electron
storage on first packaged launch only when the player explicitly imports or
recovers it; hidden automatic migration is too hard to explain and verify.

## Update Story

For first external vertical-slice playtests, ship signed/notarized direct
downloads and prove that installing a newer package preserves `userData` saves.
Do not add automatic updates before the first packaged smoke unless a
distribution channel requires them.

For release candidate, choose one of two update paths:

- Manual update smoke: install version A, save a run, install version B, verify
  save/load/recover/import/export and logs still work.
- Automatic update smoke: after signing credentials exist, wire Electron's
  update path and prove the same save-preservation behavior through the update
  flow.

Either path must preserve saves in `userData`; app binaries and bundled assets
must remain disposable.

## Platform Target

Initial target:

- macOS Apple Silicon on the user's machine.

Next target:

- Windows x64/arm64 once the macOS package launches, saves, logs, and smoke
  pass.

Deferred:

- Linux packages. Linux remains useful later, but Tauri and Electron both have
  distribution-specific packaging concerns, and Harborline's first goal is a
  trustworthy local desktop game rather than broad Linux packaging.

## Risks And Mitigations

- Package size is larger than Tauri.
  - Mitigation: keep the game bundle lean, lazy-load Pixi as it does today, and
    revisit Tauri only after the packaged Electron renderer and saves pass.
- Electron security mistakes can expose powerful APIs.
  - Mitigation: no Node integration in the renderer, context isolation,
    sandboxing, a minimal preload bridge, local-only content, and no raw file or
    IPC handles exposed to game code.
- Code signing can block external distribution.
  - Mitigation: separate local packaged smoke from signed public distribution,
    then add signing/notarization as an explicit `M-024` release gate.
- Save files can be corrupted by interrupted writes.
  - Mitigation: write to a temp file, fsync when practical, rename atomically,
    keep the current backup envelope, and preserve import/export text flows.

## Next Tasks

1. `M-022`: Add the storage adapter and Electron save/log bridge.
   - Gate: browser tests still pass, and adapter tests cover valid save,
     backup, corrupted primary recovery, import/export, delete, and missing
     bridge fallback.
   - Current status: the renderer storage adapter, browser fallback, Electron
     `main`/`preload` bridge, app-owned `userData` save path, Electron logs
     path, atomic storage writes, runtime-log rotation, focused adapter tests,
     Electron launch smoke, and packaged restart/load/import/export/recover/
     delete/corruption-recovery/update/uninstall-reinstall smoke are in place.
     This is complete for the local macOS vertical slice.

2. `M-023`: Add Electron app identity and first package scripts.
   - Gate: `npm run desktop:dev` and `npm run desktop:package:mac` exist,
     the app launches without terminal help after packaging, the window has
     Harborline identity, and the about/version surface reads from app metadata.
   - Current status: complete for the vertical slice. The macOS package script,
     generated app icon, loading state, about/version/storage/log panel,
     release-notes link, recovery copy, and packaged launch smoke are in place.

3. `M-024`: Add distribution verification.
   - Gate: a script or documented smoke launches the packaged app, verifies
     the Pixi canvas, route command, save/load/export/import/recover/delete,
     runtime log location, low-power mode, app restart, and update/install
     save preservation.
   - Current status: package smoke covers launch, identity, route command,
     save/load/export/import/recover/delete, corrupted-primary recovery,
     runtime log location, low-power mode, restart persistence, abrupt-exit
     recovery, update replacement, and uninstall/reinstall save preservation.
     This is complete for the local macOS vertical slice.

## Source Notes

- Electron documents its multi-process model and native main-process APIs:
  https://www.electronjs.org/docs/latest/tutorial/process-model
- Electron recommends context isolation and process sandboxing for security:
  https://www.electronjs.org/docs/latest/tutorial/context-isolation
  https://www.electronjs.org/docs/latest/tutorial/sandbox
- Electron exposes app data and log paths through the `app` module:
  https://www.electronjs.org/docs/latest/api/app
- Electron distribution requires packaging and should use code signing for
  user trust:
  https://www.electronjs.org/docs/latest/tutorial/distribution-overview
  https://www.electronjs.org/docs/latest/tutorial/code-signing
- Tauri's official value proposition is small, secure apps using system
  webviews:
  https://tauri.app/start/
- Tauri's Vite, filesystem, and distribution docs remain the reference if the
  Tauri decision is reopened:
  https://v2.tauri.app/start/frontend/vite/
  https://v2.tauri.app/plugin/file-system/
  https://v2.tauri.app/distribute/
