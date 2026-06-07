# Harborline Verification

## One-Command Gate

Run:

```sh
npm run verify
```

This runs:

- Unit and integration tests with Vitest.
- Desktop storage smoke for the Electron file adapter, using temp app-data
  paths and bounded runtime-log rotation.
- A deterministic core-flow smoke test covering hire crew, buy equipment, buy a
  ship, accept a contract, load exact contract cargo, buy insurance, sail, dock,
  complete the contract, resolve an encounter, save, and load.
- TypeScript and production Vite build.
- Production artifact smoke: verifies `dist/index.html` and every built JS/CSS
  asset in `dist/assets`, including lazy renderer chunks, exist and are
  non-empty.
- Automated browser regression smoke: launches the built app with Vite preview
  in Chromium and verifies the route command, contract-board listing pressure,
  canvas pixel probe, market Max/All controls, route selection, insurance,
  sailing, save/export/delete/recover/import, audio Settings cue wiring,
  playtest evidence readiness, runtime health, and fresh console errors.

Expected build shape:

- No Tailwind warning. Harborline uses handwritten CSS and a local no-op
  `postcss.config.mjs` so parent-folder Tailwind configs are not inherited.
- No Pixi bundle warning. The map renderer is lazy-loaded into a separate
  `MapScene` chunk under Harborline's 520 kB renderer warning budget.

## Electron Smoke Gate

Run:

```sh
npm run desktop:smoke
```

This builds the production app, launches Electron through Playwright, waits for
the real Harborline window, clicks the in-game Save button, and verifies that
`save.v2.json` lands under Electron `userData/harborline-game`. It also calls
the preload bridge directly to verify best-score storage and runtime logs under
Electron's logs path, then fails on fresh Electron console errors.

## Desktop Package Gate

Run:

```sh
npm run desktop:package:mac
npm run desktop:package-smoke
```

This generates the Harborline ICNS icon, builds the production renderer,
packages `release/Harborline-darwin-arm64/Harborline.app`, then launches the
packaged executable multiple times with a temporary Electron `userData` path.
The packaged smoke verifies app identity metadata, the in-game Save button,
desktop save/log paths, preload bridge storage calls, release notes,
export/import, delete/recover, corrupted-primary backup recovery, restart/load
persistence, low-power renderer mode, runtime log inspection, and fresh Electron
console errors. It also stages a temporary installed copy of the `.app`, verifies
the same save after installed launch, kills the process after a save to prove
abrupt-exit recovery, replaces the installed app to simulate an update, deletes
and reinstalls the app bundle, and verifies the Electron `userData` save survives
each lifecycle step.

The packaged smoke also verifies the playtest evidence path in app-owned
storage: generated scorecards save to `playtest.latest.md`, append typed
entries to `playtest.history.v1.json`, show missing qualification fields when
the scorecard is still blank, expose the Current Scorecard status card, report
whether saved scorecards qualify in the Save confirmation, and preserve the
qualified-scorecard readiness count when a triage report is saved.

## Browser Smoke Gate

Run the automated production browser smoke directly with:

```sh
npm run build
npm run browser:smoke
```

`npm run verify` already invokes this smoke after the production build and
artifact smoke. The browser smoke:

- Starts `vite preview` on a free `127.0.0.1` port.
- Opens `/?graphics=low&verify=browser-smoke` in headless Chromium.
- Enables software WebGL flags for deterministic Pixi rendering in headless
  environments.
- Fails on missing core controls, runtime health errors, blank or low-variety
  canvas probe output, broken contract-board/market/voyage/save/recovery
  actions, broken audio Settings or feedback-cue wiring, broken playtest
  scorecard archive/readiness/triage state, page errors, or fresh console
  errors.

Optional environment controls:

- `HARBORLINE_VERIFY_PORT=4180` pins the preview port.
- `HARBORLINE_BROWSER_EXECUTABLE=/path/to/browser` pins the browser executable.
- `HARBORLINE_BROWSER_SMOKE_HEADED=1` shows the browser while the smoke runs.
- `HARBORLINE_BROWSER_SMOKE_TIMEOUT_MS=60000` changes the voyage timeout.

## Manual Spot Check

Use the in-app browser or a local browser against the dev server when you want a
visual read on pacing, layout, or feel:

```sh
npm run dev -- --host 127.0.0.1 --port 4175
```

Open:

```text
http://127.0.0.1:4175/?verify=manual-smoke
```

Check the feel of:

- The Harborline shell loads.
- The Pixi map canvas is present and nonblank.
- The Pixi map host reports `data-canvas-pixel-status="nonblank"` after a
  short warm-up, with `data-canvas-pixel-samples` and
  `data-canvas-pixel-colors` populated.
- The route command strip is visible.
- Selecting a destination updates the strip with route time, risk, water,
  cargo, policy, and authority.
- `Load` buys recommended cargo when available.
- `Insure` buys cargo coverage when available.
- `Sail` starts an `Under Sail` voyage.
- Harbor tab allows hiring a crew member and shows crew rank/payroll.
- Intel runtime health starts as `Runtime Clean`.
- Dev-only `Probe` records one error and `Clear` resets it.
- Fresh browser console errors are zero after reload and smoke actions.

## Balance Simulation Gate

Run:

```sh
npm run simulate
```

This runs 1,000 seeded automated reducer-driven runs and reports win rate,
average and median final score, bankruptcy rate, average days survived,
completed contracts, upgraded-run rate, most profitable goods, and dead-end
states. Use this after economy, pacing, contract, shipyard, or encounter balance
changes.

## Playtest Cadence Gate

To prepare a packaged build for fresh-player sessions, run:

```sh
npm run playtest:handoff
```

This rebuilds the macOS package, writes `release/playtest-handoff/` with
`Harborline.app`, a three-session collection ledger, an observer checklist, the
current scorecard template, and a machine-readable handoff manifest, then runs
`npm run playtest:handoff:verify`. Use that folder as the source for `M-026A`
sessions so testers receive the same build and observers follow the same
qualification steps. If you only need to audit an already-built handoff folder,
run:

```sh
npm run playtest:handoff:verify
```

To create the distributable archive for testers, run:

```sh
npm run playtest:handoff:archive
```

This verifies the handoff folder, zips it with macOS `ditto` so
`Harborline.app` stays intact, and writes
`release/Harborline-playtest-handoff-<version>-<arch>.zip` plus a matching
`.manifest.json` with size, SHA-256, source handoff, build version, required
session count, and score gate.

Run:

```sh
npm run playtest:trace
```

This runs a seeded reducer-driven 20-minute playtest proxy through the same
Captain's Orders and feedback pulse surfaces the player sees. It writes
`reports/playtest-trace-latest.json` and fails if an arrival lacks a clear next
reason or if two non-defensive normal decisions collapse into pure waiting.

During external sessions, generate the Settings `Playtest Scorecard` draft from
the packaged app. Use `Playtest Evidence` when you need the raw packet by
itself, edit the scorecard text in place, then click `Check` before `Save`.
`Check` rejects raw evidence packets and lists the first missing scorecard
qualification fields so observers can complete the draft before archiving it.
The Current Scorecard status card shows the same draft state while editing:
empty, not a scorecard, incomplete, or qualified. Then click `Save` to write
`playtest.latest.md` in app-owned storage and append the bounded recent-session
archive in `playtest.history.v1.json`. The Save confirmation includes whether
a saved scorecard qualifies for `M-026A` or which fields still prevent it from
counting. Collect
`playtest.latest.md` for a single session; if multiple sessions use the same app
profile, also collect `playtest.history.v1.json`. Settings shows the current
`M-026A` intake count so observers can see whether the archive is still
collecting sessions or ready for `M-026B` triage. The count uses unique
qualified testers only: tester and observer are filled, first-time player is
`yes`, required core scores are numeric, required observer notes are filled,
Single Next Change is filled, and duplicate tester names do not advance the
gate. If a saved scorecard does not qualify, Settings and the generated triage
report list the missing fields. Once three unique qualified testers are
archived, the generated triage report also checks the vertical-slice score gate:
route-choice speed, trade clarity, risk readability, addictive pull, and replay
desire must each average at least `4/5`.
After scorecards are saved, click `Triage` to generate a markdown Playtest
Triage Report that groups candidate release blockers, high-value polish,
watchlist items, and post-release backlog rows from the archived scorecards.
Saved artifacts are typed; only unique qualified tester scorecards count toward
the `M-026A` readiness total, so saving an evidence packet, blank scorecard
draft, duplicate tester scorecard, or triage report must not advance the
three-session gate.
After collecting `playtest.history.v1.json`, run:

```sh
npm run playtest:collection:audit -- --history path/to/playtest.history.v1.json --out reports/playtest-collection-latest.md
```

This writes a Collection Audit that embeds the same readiness and triage rules
as the app. It exits nonzero unless the collection has three unique qualified
scorecards, the five release-score categories average at least `4/5`, and no
release-blocker findings are present. Use `--allow-incomplete` when generating
a mid-collection report before all three sessions are archived.

If sessions come back as separate `playtest.latest.md` scorecard files from
different machines, assemble them first:

```sh
npm run playtest:collection:assemble -- --scorecard session-1.md --scorecard session-2.md --scorecard session-3.md --out reports/playtest-collection-history.v1.json --audit-out reports/playtest-collection-latest.md
```

The assembler writes a valid history JSON, then writes the same Collection Audit
when `--audit-out` is provided. It fails on non-scorecard files and exits
nonzero unless the assembled collection clears the audit gate; add
`--allow-incomplete` for a mid-collection assembly.

Browser smoke and packaged smoke assert that the generated artifacts include
build/runtime context, route-choice evidence, observer prompts, runtime error
count, route-loop rows prefilled from completed route history, scoring sections,
a friction log, the attached evidence packet, edited observer text, and the
packaged Electron artifact file writes for latest and history artifacts.

## Ocean Benchmark Gate

Run after renderer, water, map, or performance-sensitive changes:

```sh
npm run build
npm run ocean:benchmark
npm run ocean:visual-calibration
npm run ocean:compatibility
```

This launches the production preview in Chromium and measures foreground Pixi
map FPS from the real app across desktop and compact viewports. It verifies:

- Default desktop, `1440x920`, uses `shader-mesh-v2` and averages at least
  30 FPS.
- Compact desktop, `900x700`, uses `shader-mesh-v2` and averages at least
  30 FPS.
- Low-power desktop and compact low-power use `low-power-graphics-v2` and
  average at least 24 FPS.
- Every case reports viewport, renderer, render scale, FPS current/average/min/
  max/recent, sample count, stability, adaptive fallback status, and
  nonblank/varied canvas output.
- Runtime health stays clean with no page errors or fresh console errors.
- Low-power mode is materially cheaper than the matching shader case by using a
  lower render scale and no higher pixel-color complexity.

The latest report is written to:

```text
reports/ocean-benchmark-latest.json
```

The visual calibration report is written to:

```text
reports/ocean-visual-calibration-latest.json
```

It compares the live Pixi water path against the approved realistic teal-gray
ocean references, checks palette hue/saturation/luma, depth, foam, storm, and
route-risk spread, and attaches the latest benchmark evidence.

The compatibility report is written to:

```text
reports/ocean-compatibility-latest.json
```

It verifies desktop FPS, low-power FPS, canvas health, RuntimeClean state, zero
console/page errors, intentional low-power fallback cost, route readability, and
visual calibration from the latest benchmark and calibration reports.

## Ocean Physics Spike Gate

Run after ocean model, route physics, freight-pressure, or water-technology
decision changes:

```sh
npm run build
npm run ocean:benchmark
npm run ocean:physics-spike
```

This writes `reports/ocean-physics-spike-latest.json`. It samples the shared
ocean field across all routes and 60 days, verifies route sea-state spread,
ship-response lift, route readability, cargo-slam gameplay impact, current and
freight-pressure variety, import/export price effects, and attaches the latest
ocean benchmark GPU-cost proof. The report decision should stay
`continue-pixi-first` unless the measured signals or final visual target earn a
heavier engine spike.

## Ocean Technology Spike Gate

Run when deciding whether to add a water/physics package or migrate renderers:

```sh
npm run build
npm run ocean:benchmark
npm run ocean:visual-calibration
npm run ocean:physics-spike
npm run ocean:technology-spike
```

This writes `reports/ocean-technology-spike-latest.json`. It compares the
current Pixi/OceanField path, a targeted no-dependency OceanField extension, a
2D rigid-body physics package class, a 3D reflective water renderer class, and a
heavier fluid-simulation class against buoyancy response, wake behavior, wave
response, route readability, visual calibration, GPU budget, and integration
safety. The current production decision is `extend-oceanfield-no-package`.

## Sailing Physics Gate

Run after ship-motion, wake, route physics, or sailing-debug changes:

```sh
npm run build
npm run sailing:physics
```

This writes `reports/sailing-physics-latest.json`. It verifies that route days,
risk, hull wear, storm pressure, route labels, ship motion, and wake behavior
come from the same OceanField model, and that ship roles plus cargo load produce
distinct wake length, wake spread, wake turbulence, wake persistence, and hull
response. The current production decision is
`integrated-oceanfield-sailing-v1`.

## Coverage Notes

`npm run verify` is the default local gate. The manual spot check is still
valuable for taste, pacing, and visual polish, but the core browser regression
path is automated in `scripts/browser_smoke.mjs`. The ocean benchmark is kept as
a separate gate because it is performance evidence for renderer decisions rather
than a required smoke on every ordinary gameplay change. The ocean physics
spike is kept separate because it is decision evidence for production water
technology, not a default regression check for ordinary UI/gameplay edits. The
technology spike is the extra gate for package or renderer decisions. The
sailing physics gate is the extra proof for ship-aware water feel.
