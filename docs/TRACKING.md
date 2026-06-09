# Fluid Remap Tracking

This file is the local source of truth for fluid-grid milestones, tasks, gates,
and GitHub issue mapping.

## Milestones

| ID | Milestone | Status | Exit Gate |
| --- | --- | --- | --- |
| FG-00 | Repository and tracking foundation | Done | G-FG-00 |
| FG-01 | WebGPU capability shell | Done | G-FG-01 |
| FG-02 | GPU grid allocation and stepping | Done | G-FG-02 |
| FG-03 | Grid-backed water rendering | Done | G-FG-03 |
| FG-04 | Two-way rigid-body/fluid coupling | Done | G-FG-04 |
| FG-05 | Splash, foam, and spray from grid state | Done | G-FG-05 |
| FG-06 | Calibration and near-realism validation | Done | G-FG-06 |
| FG-07 | Local GPU calibration and frame pacing | Done | G-FG-07 |
| FG-08 | Fixed-step simulation loop hardening | Done | G-FG-08 |
| FG-09 | Research-backed solver architecture decision | Done | G-FG-09 |
| FG-10 | Reference dataset ingestion and measurement harness | Done | G-FG-10 |
| FG-11 | Conservative GPU shallow-water upgrade | Done | G-FG-11 |
| FG-12 | Localized particle splash and spray layer | Done | G-FG-12 |
| FG-13 | Coupled packaged-app calibration against reference cases | Done | G-FG-13 |
| FG-14 | Live particle splash feedback in packaged renderer | Done | G-FG-14 |
| FG-15 | Bounded pressure-gradient broad-water acceleration | Done | G-FG-15 |
| FG-16 | Live pressure-gradient broad-water renderer path | Done | G-FG-16 |
| FG-17 | Pressure-informed rigid-body force feedback | Done | G-FG-17 |
| FG-18 | Live coupled reference outcome gate | Done | G-FG-18 |
| FG-19 | Packaged display pacing and smoothness gate | Done | G-FG-19 |
| FG-20 | Ultra-tier resolution scaling gate | Done | G-FG-20 |
| FG-21 | Opt-in ultra-tier live renderer gate | Done | G-FG-21 |
| FG-22 | Ultra-tier live reference outcome gate | Done | G-FG-22 |
| FG-23 | Adaptive local GPU tier calibration selector | Done | G-FG-23 |
| FG-24 | Persisted local calibration profile runtime gate | Done | G-FG-24 |
| FG-25 | Installed local calibration profile reuse gate | Done | G-FG-25 |
| FG-26 | Installed calibration display pacing gate | Done | G-FG-26 |
| FG-27 | Calibration profile freshness invalidation gate | Done | G-FG-27 |
| FG-28 | Calibration profile hardware provenance gate | Done | G-FG-28 |
| FG-29 | Sustained calibrated interaction pacing gate | Done | G-FG-29 |
| FG-30 | Local cached packaging reproducibility gate | Done | G-FG-30 |
| FG-31 | Live impact energy budget gate | Done | G-FG-31 |
| FG-32 | Live surface recovery damping gate | Done | G-FG-32 |
| FG-33 | Desktop launcher install reproducibility gate | Done | G-FG-33 |
| FG-34 | Default-profile calibrated Desktop launch gate | Done | G-FG-34 |
| FG-35 | Visible calibrated Desktop window gate | Done | G-FG-35 |
| FG-36 | Installed calibrated reference outcome gate | Done | G-FG-36 |
| FG-37 | Installed reference pacing envelope gate | Done | G-FG-37 |
| FG-38 | Experimental high-resolution grid headroom gate | Done | G-FG-38 |
| FG-39 | Experimental high-resolution live renderer gate | Done | G-FG-39 |
| FG-40 | Experimental high-resolution reference outcomes gate | Done | G-FG-40 |
| FG-41 | Persisted high-resolution runtime-grid calibration gate | Done | G-FG-41 |
| FG-42 | Installed high-resolution reference pacing gate | Done | G-FG-42 |
| FG-43 | Installed high-resolution float/sink envelope gate | Done | G-FG-43 |
| FG-44 | Installed high-resolution Desktop visibility gate | Done | G-FG-44 |
| FG-45 | Installed high-resolution operator readout gate | Done | G-FG-45 |
| FG-46 | Installed high-resolution reference residual budget gate | Done | G-FG-46 |
| FG-47 | Installed high-resolution visual watchdog gate | Done | G-FG-47 |
| FG-48 | Target-aware high-resolution residual budget gate | Done | G-FG-48 |
| FG-49 | Desktop probe isolation gate | Done | G-FG-49 |
| FG-50 | High-resolution calibration frontier gate | Done | G-FG-50 |

## Gates

| Gate | Blocks | Command or Evidence | Pass Bar |
| --- | --- | --- | --- |
| G-FG-00 | FG-00 | `npm run fluid:tracking` | docs, issue templates, and code contract agree on milestones and gates |
| G-FG-01 | FG-01 | `npm run fluid:capability`; `docs/evidence/FG-01-fluid-capability-2026-06-07.json` | adapter/device limits captured; unsupported hardware has intentional fallback |
| G-FG-02 | FG-02 | `npm run fluid:grid`; `docs/evidence/FG-02-fluid-grid-benchmark-2026-06-07.json` | standard grid steps inside frame budget with stable CFL and no full-grid readback |
| G-FG-03 | FG-03 | `npm run fluid:render`; `docs/evidence/FG-03-fluid-render-probe-2026-06-07.json` | WebGPU renderer is nonblank/varied and Canvas 2D is not the primary water path |
| G-FG-04 | FG-04 | `npm run fluid:coupling`; `docs/evidence/FG-04-fluid-coupling-2026-06-07.json` | object entry writes footprint, depth impedance, and displacement impulses to the WebGPU grid; the next physics step consumes bounded grid force deltas |
| G-FG-05 | FG-05 | `npm run fluid:splash`; `docs/evidence/FG-05-fluid-splash-2026-06-07.json` | splash crown, foam, spray, and secondary impacts are driven by bounded local WebGPU grid energy |
| G-FG-06 | FG-06 | `npm run fluid:calibration`; `docs/evidence/FG-06-fluid-calibration-2026-06-07.json` | reference cases and prior WebGPU gates match accepted error bounds for impact speed, splash height, damping, float behavior, and evidence completeness |
| G-FG-07 | FG-07 | `npm run fluid:local-calibrate`; `npm run fluid:local-calibrate:packaged`; `docs/evidence/FG-07-local-calibration-2026-06-08.json` | local Electron and packaged desktop runs record WebGPU renderer telemetry, timestamp-query GPU grid timing, and smooth idle/drop frame pacing with bounded p95/p99 frame times |
| G-FG-08 | FG-08 | `npm run fluid:frame-loop`; `docs/evidence/FG-08-frame-loop-2026-06-08.json` | the app advances rigid-body physics through a bounded fixed-step accumulator with WebGPU rendering active and no dropped simulation debt at normal speed |
| G-FG-09 | FG-09 | `npm run fluid:architecture`; `docs/evidence/FG-09-solver-architecture-2026-06-08.json` | primary-source solver decision selects a hybrid GPU heightfield/free-surface grid plus localized particle splash layer, rejects incomplete immediate paths, and names the next calibration-backed gates |
| G-FG-10 | FG-10 | `npm run fluid:references`; `docs/evidence/FG-10-reference-dataset-2026-06-08.json` | drop, splash, float, sink, and damping reference cases ingest with source metadata, units, uncertainty, resolved expected bands, and replayed CPU-reference measurements |
| G-FG-11 | FG-11 | `npm run fluid:shallow-water`; `docs/evidence/FG-11-shallow-water-2026-06-08.json` | standard and high WebGPU tiers step conservative height and x/y momentum fields with bounded mass drift, momentum damping, wet/dry stability, CFL, and local GPU timing |
| G-FG-12 | FG-12 | `npm run fluid:particles`; `docs/evidence/FG-12-particle-splash-2026-06-08.json` | standard and high WebGPU tiers step localized splash particles with bounded mass and momentum, splash crown inside the reference band, measurable reentry feedback, and local GPU timing |
| G-FG-13 | FG-13 | `npm run fluid:coupled-calibrate`; `docs/evidence/FG-13-coupled-calibration-2026-06-08.json` | the packaged desktop app, reference replay, shallow-water evidence, and particle-splash evidence pass as one coupled calibration packet for drop, splash, float, sink, damping, frame pacing, and bounded GPU readback |
| G-FG-14 | FG-14 | `npm run fluid:live-particles`; `docs/evidence/FG-14-live-particles-2026-06-08.json` | the packaged WebGPU renderer exposes and uses localized particle splash feedback with bounded mass, momentum, crown height, reentry energy, local grid feedback, and no Canvas fallback |
| G-FG-15 | FG-15 | `npm run fluid:pressure`; `docs/evidence/FG-15-pressure-gradient-2026-06-08.json` | standard and high WebGPU tiers use bounded pressure-gradient acceleration with mass, wet/dry, energy, momentum-budget, slope-limiter, CFL, and timestamp-query evidence |
| G-FG-16 | FG-16 | `npm run fluid:live-pressure`; `docs/evidence/FG-16-live-pressure-2026-06-08.json` | the packaged WebGPU renderer advances live broad water with bounded pressure-gradient momentum buffers and exposes pressure plus particle telemetry without Canvas fallback or full-grid readback |
| G-FG-17 | FG-17 | `npm run fluid:live-pressure-feedback`; `docs/evidence/FG-17-pressure-feedback-2026-06-08.json` | the packaged app feeds bounded live pressure force deltas into the rigid-body grid coupling consumed by `stepSimulation` while retaining WebGPU pressure, object-grid, and particle telemetry |
| G-FG-18 | FG-18 | `npm run fluid:live-reference-outcomes`; `docs/evidence/FG-18-live-reference-outcomes-2026-06-08.json` | the packaged app exposes live physics snapshots and passes reference-outcome comparisons for drop, splash, float, sink, and damping while WebGPU pressure, particle, object-grid, and fixed-step telemetry remain bounded |
| G-FG-19 | FG-19 | `npm run fluid:display-pacing`; `docs/evidence/FG-19-display-pacing-2026-06-08.json` | the packaged app sustains smooth display pacing across idle, dense impact, and foam damping scenarios at 1x with WebGPU pressure, particles, object-grid coupling, no dropped simulation debt, and no long-task stalls from diagnostics |
| G-FG-20 | FG-20 | `npm run fluid:resolution-scale`; `docs/evidence/FG-20-resolution-scaling-2026-06-08.json` | the packaged app benchmarks standard, high, and ultra WebGPU tiers across grid stepping, bounded pressure shallow water, and localized particle splash with timestamp-query timing, bounded memory growth, no full-grid readback, and stable ultra/high timing ratios |
| G-FG-21 | FG-21 | `npm run fluid:ultra-renderer`; `docs/evidence/FG-21-ultra-renderer-2026-06-08.json` | the packaged app honors an explicit ultra-tier request, selects the live `768 x 432` WebGPU renderer, and sustains smooth idle and concrete-impact display pacing with pressure, particles, object-grid coupling, zero dropped simulation debt, and no Canvas fallback |
| G-FG-22 | FG-22 | `npm run fluid:ultra-reference-outcomes`; `docs/evidence/FG-22-ultra-reference-outcomes-2026-06-08.json` | the packaged app honors an explicit ultra-tier request, selects the live `768 x 432` WebGPU renderer, and passes live reference comparisons for drop, splash, float, sink, and damping with pressure, particles, object-grid coupling, fixed-step telemetry, and no full-grid readback |
| G-FG-23 | FG-23 | `npm run fluid:adaptive-tier`; `docs/evidence/FG-23-adaptive-tier-2026-06-08.json` | the packaged app composes local resolution, ultra renderer, and ultra reference evidence into a calibrated auto tier recommendation, then launches with auto tier selection and proves calibrated-auto selects the live `768 x 432` ultra WebGPU renderer |
| G-FG-24 | FG-24 | `npm run fluid:persisted-calibration`; `docs/evidence/FG-24-persisted-calibration-2026-06-08.json` | the packaged app reads an app-owned local calibration profile without a calibrated-tier environment variable, auto-requests the saved calibrated tier, and proves calibrated-auto selects the live `768 x 432` ultra WebGPU renderer while explicit overrides remain supported |
| G-FG-25 | FG-25 | `npm run fluid:installed-calibration`; `docs/evidence/FG-25-installed-calibration-2026-06-08.json` | the calibration installer writes a passing FG-23 profile through app-owned desktop storage, then two clean packaged launches reuse the installed profile without fluid-tier environment variables and select the live `768 x 432` ultra WebGPU renderer |
| G-FG-26 | FG-26 | `npm run fluid:installed-display-pacing`; `docs/evidence/FG-26-installed-display-pacing-2026-06-08.json` | the normal installed-profile startup path selects calibrated-auto ultra without fluid-tier environment variables and sustains smooth idle, concrete-impact, and foam-damping display pacing with WebGPU pressure, particles, object-grid coupling, fixed-step debt, and long-task telemetry |
| G-FG-27 | FG-27 | `npm run fluid:calibration-freshness`; `docs/evidence/FG-27-calibration-freshness-2026-06-08.json` | calibration profiles include app-version and FG-23 source provenance; Electron reuses the current profile for calibrated-auto ultra but rejects a stale app-version profile and falls back to default high without fluid-tier environment variables |
| G-FG-28 | FG-28 | `npm run fluid:calibration-provenance`; `docs/evidence/FG-28-calibration-provenance-2026-06-08.json` | calibration profiles bind to FG-01 WebGPU capability provenance; the packaged app reuses a matching profile, downgrades a copied-profile hardware mismatch to high, and rejects a tampered capability fingerprint without fluid-tier environment variables |
| G-FG-29 | FG-29 | `npm run fluid:sustained-interaction-pacing`; `docs/evidence/FG-29-sustained-interaction-pacing-2026-06-08.json` | a packaged installed-profile calibrated-auto ultra run drives a sustained mixed-object workload while the WebGPU renderer remains on `768 x 432`, active pressure/particles/coupling are observed, display pacing stays smooth, and fixed-step simulation debt remains bounded |
| G-FG-30 | FG-30 | `npm run fluid:package-reproducibility`; `docs/evidence/FG-30-package-reproducibility-2026-06-08.json` | the macOS package path uses the exact local cached Electron zip for the current version, rebuilds the packaged app without remote checksum dependency, and then passes sustained calibrated-auto ultra interaction evidence |
| G-FG-31 | FG-31 | `npm run fluid:impact-energy-budget`; `docs/evidence/FG-31-impact-energy-budget-2026-06-08.json` | the ultra live concrete impact reports a source-traced, bounded energy budget across pressure impulse, splash grid energy, foam and potential energy, particle reentry, ejected mass, and WebGPU no-full-grid-readback telemetry |
| G-FG-32 | FG-32 | `npm run fluid:surface-recovery`; `docs/evidence/FG-32-surface-recovery-2026-06-08.json` | the packaged ultra WebGPU renderer shows post-impact visible surface agitation, foam, and pressure-work recovery over a deep-water concrete drop while maintaining active pressure, particles, coupling, fixed-step pacing, and no full-grid readback |
| G-FG-33 | FG-33 | `npm run fluid:desktop-launcher`; `docs/evidence/FG-33-desktop-launcher-2026-06-08.json` | the app packages into a stable local install root outside the workspace, the Desktop launcher resolves to the signed app bundle, and the exact Desktop target renders nonblank/varied WebGPU pixels with the default user profile |
| G-FG-34 | FG-34 | `npm run fluid:default-profile-calibration`; `docs/evidence/FG-34-default-profile-calibration-2026-06-08.json` | the real default Ocean Impact Lab profile contains a provenance-valid local calibration profile and the exact Desktop launcher starts without fluid-tier environment overrides in calibrated-auto ultra on the live `768 x 432` WebGPU renderer |
| G-FG-35 | FG-35 | `npm run fluid:desktop-visibility`; `docs/evidence/FG-35-desktop-visibility-2026-06-08.json` | a normal macOS Desktop launch starts the installed calibrated app, exposes a visible frontmost Ocean Impact Lab window, and the captured ocean viewport is nonblank/varied instead of a black surface |
| G-FG-36 | FG-36 | `npm run fluid:installed-reference-outcomes`; `docs/evidence/FG-36-installed-reference-outcomes-2026-06-08.json` | the real installed Desktop app uses the default calibrated profile with no fluid-tier environment overrides and passes drop, splash, float, sink, and damping reference outcomes on calibrated-auto ultra WebGPU |
| G-FG-37 | FG-37 | `npm run fluid:installed-reference-pacing`; `docs/evidence/FG-37-installed-reference-pacing-2026-06-08.json` | the real installed Desktop app composes passing FG-36 reference outcomes with smooth calibrated-auto ultra display pacing while exercising concrete drop/splash, ice float, foam damping, concrete sink, and leaky-drum sink reference scenarios without fluid-tier or userData environment overrides |
| G-FG-38 | FG-38 | `npm run fluid:high-resolution-headroom`; `docs/evidence/FG-38-high-resolution-headroom-2026-06-08.json` | the packaged Desktop app keeps production runtime selection capped at ultra while benchmark-only explicit high-resolution grids beyond `768 x 432` pass WebGPU grid, bounded pressure-gradient, and localized particle-splash timing, memory, no-readback, and diagnostic thresholds with timestamp-query evidence |
| G-FG-39 | FG-39 | `npm run fluid:experimental-live-grid`; `docs/evidence/FG-39-experimental-live-grid-2026-06-08.json` | the packaged Desktop app keeps default calibrated capability selection capped at ultra `768 x 432` while an explicit experimental runtime flag drives the live WebGPU renderer at `1024 x 576` with smooth idle and concrete-impact pacing, active pressure/particles/coupling, and no full-grid readback |
| G-FG-40 | FG-40 | `npm run fluid:experimental-reference-outcomes`; `docs/evidence/FG-40-experimental-reference-outcomes-2026-06-08.json` | the packaged Desktop app runs the experimental `1024 x 576` live WebGPU renderer through drop, splash, float, sink, and damping reference cases while capability selection remains capped at ultra `768 x 432` and no full-grid readback is used |
| G-FG-41 | FG-41 | `npm run fluid:high-resolution-calibration`; `docs/evidence/FG-41-high-resolution-calibration-2026-06-08.json` | a persisted local calibration profile derived from passing FG-40 evidence launches the packaged app at live `1024 x 576` without `OCEAN_LAB_EXPERIMENTAL_FLUID_GRID` while capability selection remains capped at ultra `768 x 432` |
| G-FG-42 | FG-42 | `npm run fluid:installed-high-resolution-reference-pacing`; `docs/evidence/FG-42-installed-high-resolution-reference-pacing-2026-06-08.json` | the real installed Desktop app uses the default `fluid-calibration.v1.json` profile with a persisted FG-40 runtime grid, no fluid-tier, grid, or userData environment overrides, replays reference outcomes, and sustains smooth live `1024 x 576` WebGPU pacing |
| G-FG-43 | FG-43 | `npm run fluid:installed-high-resolution-float-sink`; `docs/evidence/FG-43-installed-high-resolution-float-sink-envelope-2026-06-08.json` | the real installed Desktop app uses the default high-resolution profile to exercise every object preset at live `1024 x 576`, proving stable floaters, immediate sinkers, waterlogging-then-sink predictions, smooth WebGPU pacing, and a nonblank/varied high-resolution viewport screenshot |
| G-FG-44 | FG-44 | `npm run fluid:installed-high-resolution-desktop-visibility`; `docs/evidence/FG-44-installed-high-resolution-desktop-visibility-2026-06-08.json` | the normal macOS Desktop launch path opens the installed app with the FG-43 high-resolution profile, exposes a frontmost Ocean Impact Lab window, and captures nonblank/varied ocean viewport pixels from the user-visible screen |
| G-FG-45 | FG-45 | `npm run fluid:installed-high-resolution-operator-readout`; `docs/evidence/FG-45-installed-high-resolution-operator-readout-2026-06-08.json` | the installed high-resolution Desktop app lets an operator use the visible preset and Drop controls for float, sink, and waterlogging objects, and the visible Float Result, Float Timing, impact, splash, renderer, and pacing readouts match live `1024 x 576` WebGPU physics snapshots |
| G-FG-46 | FG-46 | `npm run fluid:installed-high-resolution-residual-budget`; `docs/evidence/FG-46-installed-high-resolution-residual-budget-2026-06-08.json` | the installed high-resolution reference packet reports normalized residuals and nearest-bound margins for drop, splash, float, sink, and damping comparisons while preserving live `1024 x 576` WebGPU, no-readback, pacing, and operator snapshot provenance |
| G-FG-47 | FG-47 | `npm run fluid:installed-high-resolution-visual-watchdog`; `docs/evidence/FG-47-installed-high-resolution-visual-watchdog-2026-06-08.json` | the installed high-resolution Desktop app captures multiple idle and post-drop `1024 x 576` WebGPU canvas pixel probes over advancing water frames, rejecting black, flat, stale, fallback, or UI-only visual evidence while preserving FG-46 residual and no-readback provenance |
| G-FG-48 | FG-48 | `npm run fluid:installed-high-resolution-target-residuals`; `docs/evidence/FG-48-installed-high-resolution-target-residuals-2026-06-08.json` | the installed high-resolution residual packet reclassifies each accepted comparison as `target-midpoint`, `lower-is-better`, or `exact`, computes target error separately from tolerance-edge margin, and consumes FG-46 residual plus FG-47 visual watchdog provenance before accepting live `1024 x 576` WebGPU behavior |
| G-FG-49 | FG-49 | `npm run fluid:desktop-probe-isolation`; `docs/evidence/FG-49-desktop-probe-isolation-2026-06-09.json` | a normal packaged default-profile Desktop instance remains alive while a second packaged temporary-profile render probe starts with isolated userData, renders nonblank/varied WebGPU pixels, and proves Electron applies `HARBORLINE_USER_DATA_DIR` before `requestSingleInstanceLock` |
| G-FG-50 | FG-50 | `npm run fluid:high-resolution-calibration-frontier`; `docs/evidence/FG-50-high-resolution-calibration-frontier-2026-06-09.json` | FG-48 target residuals are ranked into a no-regression calibration frontier that keeps live `1024 x 576` WebGPU provenance, preserves accepted bands, marks foam settled buoyancy as a physics tuning candidate, and marks concrete drop speed as a reference-target review before any blind drag tuning |

## Tasks

| Task | Milestone | Status | Type | Exit Proof |
| --- | --- | --- | --- | --- |
| FG-00-T01 | FG-00 | Done | repo | Local Git repo initialized with artifact ignores |
| FG-00-T02 | FG-00 | Done | architecture | Fluid-grid remap doc committed locally |
| FG-00-T03 | FG-00 | Done | tracking | Milestone, task, gate, and issue-template tracking exists |
| FG-00-T04 | FG-00 | Done | github | Remote `origin` points to `https://github.com/AC-21/ocean.git`; local `main` pushed and tracks `origin/main` |
| FG-01-T01 | FG-01 | Done | capability | `npm run fluid:capability` reports `webgpu-ready`, adapter `apple / metal-3`, high tier, features, and limits |
| FG-01-T02 | FG-01 | Done | architecture | `src/fluid/fluidBackend.ts` defines WebGPU production, CPU reference, and Canvas diagnostic backends |
| FG-01-T03 | FG-01 | Done | diagnostics | `OceanPhysicsApp` exposes backend, status, tier, grid size, adapter, storage limit, and fallback reason |
| FG-02-T01 | FG-02 | Done | compute | WebGPU benchmark allocates height, height scratch, velocity, foam, obstacle, depth, and impulse buffers |
| FG-02-T02 | FG-02 | Done | compute | `fluidGridStepShader` runs fixed-substep propagation, damping, depth, obstacle, impulse, and foam passes |
| FG-02-T03 | FG-02 | Done | verification | `npm run fluid:grid` passes standard and high tiers with CFL `0.566`, no per-frame full-grid readback, and committed evidence |
| FG-03-T01 | FG-03 | Done | renderer | `.ocean-canvas` uses primary renderer `webgpu-grid-primary-v1` with context `webgpu` |
| FG-03-T02 | FG-03 | Done | renderer | Legacy Canvas 2D rendering is only reached after explicit WebGPU fallback telemetry |
| FG-03-T03 | FG-03 | Done | verification | `npm run fluid:render` proves nonblank/varied WebGPU pixels and rejects the legacy Canvas renderer as primary |
| FG-04-T01 | FG-04 | Done | physics | `FluidWaterRenderer` writes active object footprints, depth impedance, and displacement impulses into bounded WebGPU grid rows |
| FG-04-T02 | FG-04 | Done | physics | `stepSimulation` consumes the latest bounded grid coupling force deltas for vertical and horizontal rigid-body motion |
| FG-04-T03 | FG-04 | Done | verification | `npm run fluid:coupling` verifies a concrete cube drop with 141 bounded samples, nonzero impulse, and finite force deltas |
| FG-05-T01 | FG-05 | Done | physics | `gridSplashCouplingFor` derives foam, spray, crown height, entrained air, and breakup from local grid energy plus Weber/Froude impact state |
| FG-05-T02 | FG-05 | Done | physics | WebGPU renderer writes foam and secondary reentry impulse samples back into bounded local grid rows |
| FG-05-T03 | FG-05 | Done | verification | `npm run fluid:splash` verifies grid-splash-v1 with 4325 foam cells, 198 spray droplets, 1.553 m crown, and droplet reentry energy |
| FG-06-T01 | FG-06 | Done | calibration | Calibration packet covers dense impact, timestep convergence, ice draft, foam settling, splash height, leak sensitivity, and underwater terminal velocity |
| FG-06-T02 | FG-06 | Done | calibration | `fluidCalibration.ts` defines accepted error bounds for impact speed, splash height, damping/settling, float behavior, leak sensitivity, and terminal velocity |
| FG-06-T03 | FG-06 | Done | release | `npm run fluid:calibration` passes 7 calibration cases and 5 WebGPU evidence checks with committed evidence |
| FG-07-T01 | FG-07 | Done | calibration | `fluidLocalCalibration.ts` defines local smoothness thresholds for p95/p99 frame time, dropped-frame ratio, duplicate water-frame ratio, and WebGPU renderer telemetry |
| FG-07-T02 | FG-07 | Done | calibration | `npm run fluid:local-calibrate` and `npm run fluid:local-calibrate:packaged` launch the desktop app paths, sample idle/drop frame pacing, and write `reports/fluid-local-calibration-latest.json` |
| FG-07-T03 | FG-07 | Done | performance | Packaged-app calibration passed with timestamp-query GPU samples, high-tier GPU p95 `0.0271 ms`, idle/drop p99 `9.4 ms`, and no dropped frames |
| FG-08-T01 | FG-08 | Done | performance | `fluidFrameLoop.ts` plans `1/120 s` fixed physics steps with interpolation alpha, accumulated-debt bounds, and a max-substep guard |
| FG-08-T02 | FG-08 | Done | performance | `OceanPhysicsApp` uses `planFluidFrameStep` instead of variable render-sized physics steps and exposes `window.__fluidFrameLoopStats` |
| FG-08-T03 | FG-08 | Done | verification | `npm run fluid:frame-loop` records `420` fixed physics steps, `421` WebGPU water frames, max substeps `1/24`, and zero dropped simulation debt |
| FG-09-T01 | FG-09 | Done | research | `fluidSolverArchitecture.ts` records Stable Fluids, SIGGRAPH fluid simulation notes, heightfield-plus-particle water, Position Based Fluids, GPU shallow-water validation, and rigid-body water interaction sources |
| FG-09-T02 | FG-09 | Done | architecture | `npm run fluid:architecture` scores broad heightfield-only, full 3D Eulerian, particle-only, stable-fluids Eulerian, and hybrid heightfield-plus-particles options |
| FG-09-T03 | FG-09 | Done | planning | FG-09 evidence names FG-10 through FG-13 gates for reference ingestion, conservative shallow-water upgrade, local particle splash, and coupled calibration |
| FG-10-T01 | FG-10 | Done | data | `data/fluid-reference-cases.json` records drop, splash, float, sink, and damping cases with source metadata, units, uncertainty, and explicit expected formulas or bands |
| FG-10-T02 | FG-10 | Done | verification | `fluidReferenceDataset.ts` rejects missing categories, unsupported source locators, missing source IDs, missing units, and non-replayable measurement methods |
| FG-10-T03 | FG-10 | Done | calibration | `npm run fluid:references` evaluates entry speed, hydrostatic draft, damped settling, splash height, leak sensitivity, and terminal speed into FG-10 committed evidence |
| FG-11-T01 | FG-11 | Done | compute | `fluidShallowWater.ts` defines conservative-shallow-water-v1 with ping-pong height, x/y momentum, and dry-mask buffers |
| FG-11-T02 | FG-11 | Done | diagnostics | `runShallowWaterBenchmark` reports mass drift, momentum damping, negative-depth count, dry-cell leakage, wet/dry counts, CFL, wall timing, and timestamp-query GPU timing |
| FG-11-T03 | FG-11 | Done | verification | `npm run fluid:shallow-water` passes standard and high tiers with zero reported mass drift, stable wet/dry cells, no negative depths, and committed FG-11 evidence |
| FG-12-T01 | FG-12 | Done | compute | `fluidParticleSplash.ts` defines localized-particle-splash-v1 with deterministic particle seeding from displaced water mass, Weber/Froude impact state, and reference splash bands |
| FG-12-T02 | FG-12 | Done | diagnostics | `runParticleSplashBenchmark` reports mass fraction, momentum fraction, crown height, reentry energy, foam contribution, bounded feedback samples, and timestamp-query GPU timing |
| FG-12-T03 | FG-12 | Done | verification | `npm run fluid:particles` passes standard and high tiers with bounded mass/momentum, reference-band crown height, local reentry feedback, and committed FG-12 evidence |
| FG-13-T01 | FG-13 | Done | calibration | `fluidCoupledCalibration.ts` composes packaged-app local calibration, FG-10 reference replay, FG-11 shallow-water evidence, and FG-12 particle-splash evidence |
| FG-13-T02 | FG-13 | Done | calibration | `createFluidCoupledCalibrationReport` verifies drop speed, CPU/particle splash crown agreement, float/sink/damping references, frame pacing, mass drift, spray mass, reentry, and readback discipline |
| FG-13-T03 | FG-13 | Done | verification | `npm run fluid:coupled-calibrate` packages the app, passes packaged WebGPU runtime calibration, and writes committed FG-13 coupled evidence |
| FG-14-T01 | FG-14 | Done | physics | `fluidParticleSplash.ts` derives localized-particle-splash-live-v1 from displaced mass, Weber/Froude state, splash reference bands, and reentry energy |
| FG-14-T02 | FG-14 | Done | renderer | `FluidWaterRenderer` exposes `lastParticleSplash`, writes particle foam/impulse feedback into bounded grid rows, and passes particle crown/density/reentry into render uniforms |
| FG-14-T03 | FG-14 | Done | verification | `npm run fluid:live-particles` launches the packaged app, drops the concrete cube, and records active localized-particle-splash-live-v1 telemetry with bounded mass/momentum and WebGPU renderer context |
| FG-15-T01 | FG-15 | Done | physics | `fluidShallowWater.ts` exposes bounded-pressure-gradient-v1 with nonzero pressure gain, slope limiting, momentum limiting, and preserved conservative baseline mode |
| FG-15-T02 | FG-15 | Done | diagnostics | `runShallowWaterBenchmark` reports pressure work estimate, energy drift, pressure momentum budget ratio, slope-limited cells, dry leakage, negative depths, and timestamp-query timing |
| FG-15-T03 | FG-15 | Done | verification | `npm run fluid:pressure` passes standard and high WebGPU tiers and writes `docs/evidence/FG-15-pressure-gradient-2026-06-08.json` |
| FG-16-T01 | FG-16 | Done | renderer | `FluidWaterRenderer` allocates x/y momentum ping-pong buffers and runs `fluidWaterPressureStepShader` with pressure gain, slope limiting, momentum limiting, depth, obstacle, impulse, and foam state |
| FG-16-T02 | FG-16 | Done | diagnostics | `FluidWaterRenderer` stats and canvas dataset expose bounded-pressure-gradient-live-v1, pressure gain, slope limit, momentum limit, CFL, storage, work, impulse energy, and no-full-grid-readback telemetry |
| FG-16-T03 | FG-16 | Done | verification | `npm run fluid:live-pressure` launches the packaged app, drops the concrete cube, and records active live pressure plus live particle telemetry in `docs/evidence/FG-16-live-pressure-2026-06-08.json` |
| FG-17-T01 | FG-17 | Done | physics | `livePressureSummaryFor` reports nonzero bounded vertical and horizontal pressure force deltas, pressure grid velocity, and force bounds from live pressure work, impulse, displaced volume, and object motion |
| FG-17-T02 | FG-17 | Done | integration | `OceanPhysicsApp` combines pressure force deltas with object-grid force deltas in `gridCouplingRef` and exposes `window.__fluidGridCouplingForces` for the next fixed step consumed by `stepSimulation` |
| FG-17-T03 | FG-17 | Done | verification | `npm run fluid:live-pressure-feedback` launches the packaged app, drops the concrete cube, and records active pressure force deltas plus combined consumed grid coupling in `docs/evidence/FG-17-pressure-feedback-2026-06-08.json` |
| FG-18-T01 | FG-18 | Done | diagnostics | `OceanPhysicsApp` exposes `window.__oceanPhysicsSnapshot` and `window.__oceanPhysicsScenarioControls` with live drop, impact, float prediction, damping, sink, and diagnostic values |
| FG-18-T02 | FG-18 | Done | verification | `npm run fluid:live-reference-outcomes` drives the packaged app through concrete, ice, foam, and leaky-drum reference scenarios and compares live outcomes against accepted bands |
| FG-18-T03 | FG-18 | Done | telemetry | FG-18 evidence records WebGPU renderer context, bounded pressure feedback, live particles, object-grid coupling, no full-grid readback, and fixed-step frame-loop health |
| FG-19-T01 | FG-19 | Done | diagnostics | `OceanPhysicsApp` publishes fast motion snapshots every frame while scenario controls can request full prediction and equilibrium snapshots on demand |
| FG-19-T02 | FG-19 | Done | verification | `fluidDisplayPacing.report.ts` samples idle, concrete impact, and foam damping in the packaged app with RAF frame timing, long-task, WebGPU renderer, pressure, particle, and coupling telemetry |
| FG-19-T03 | FG-19 | Done | performance | `npm run fluid:display-pacing` passes with worst p95 `9.2 ms`, p99 `9.3 ms`, `0.13%` dropped-frame ratio, zero long-task duration, and zero dropped simulation debt |
| FG-20-T01 | FG-20 | Done | diagnostics | `fluidResolutionScaling.ts` requires standard, high, and ultra evidence with GPU timestamp timing, monotonic cell/storage growth, no full-grid readback, and bounded ultra/high p95 ratios |
| FG-20-T02 | FG-20 | Done | verification | `fluidResolutionScaling.report.ts` launches the packaged app and runs grid, pressure shallow-water, and particle splash benchmarks for standard, high, and ultra tiers |
| FG-20-T03 | FG-20 | Done | performance | `npm run fluid:resolution-scale` passes with ultra `331776` cells, grid p95 `0.0903 ms`, pressure p95 `0.0733 ms`, particle p95 `0.0288 ms`, and `17.97 MiB` measured storage |
| FG-21-T01 | FG-21 | Done | integration | Electron passes `OCEAN_LAB_FLUID_TIER` as a `fluidTier` query parameter and `OceanPhysicsApp` routes it through `detectFluidCapability` without bypassing fallback limits |
| FG-21-T02 | FG-21 | Done | verification | `fluidUltraRenderer.report.ts` launches the packaged app with `OCEAN_LAB_FLUID_TIER=ultra` and waits for selected tier `ultra`, grid `768 x 432`, renderer `webgpu-grid-primary-v1`, and canvas water tier `ultra` |
| FG-21-T03 | FG-21 | Done | performance | `npm run fluid:ultra-renderer` passes idle and concrete-impact ultra display pacing with worst p95 `9.3 ms`, p99 `9.4 ms`, zero dropped-frame ratio, and zero dropped simulation debt |
| FG-22-T01 | FG-22 | Done | calibration | `fluidUltraReferenceOutcomes.ts` defines the FG-22 ultra reference outcome gate, required comparison IDs, required categories, and failure checks for tier, grid, telemetry, coupling, and frame-loop health |
| FG-22-T02 | FG-22 | Done | verification | `fluidUltraReferenceOutcomes.report.ts` launches the packaged app with `OCEAN_LAB_FLUID_TIER=ultra` and drives concrete, ice, foam, sink, and leaky-drum live reference scenarios |
| FG-22-T03 | FG-22 | Done | calibration | `npm run fluid:ultra-reference-outcomes` passes with selected tier `ultra`, grid `768 x 432`, 5 live cases, 10 reference comparisons, active pressure/particles/coupling during concrete impact, and no full-grid readback |
| FG-23-T01 | FG-23 | Done | calibration | `fluidAdaptiveTier.ts` parses explicit, calibrated-auto, default-high, and auto-fallback-high modes while preserving explicit user tier overrides |
| FG-23-T02 | FG-23 | Done | calibration | `fluidAdaptiveTier.ts` recommends ultra only when FG-20 resolution scaling, FG-21 ultra renderer pacing, and FG-22 ultra reference outcomes pass local headroom thresholds |
| FG-23-T03 | FG-23 | Done | verification | `npm run fluid:adaptive-tier` passes with recommendation `ultra`, calibrated-auto runtime mode, selected grid `768 x 432`, WebGPU renderer, and committed FG-23 evidence |
| FG-24-T01 | FG-24 | Done | calibration | `electron/storage.cjs` allowlists `fluid-calibration.v1.json` and storage tests cover safe read/write behavior for the fluid calibration profile |
| FG-24-T02 | FG-24 | Done | integration | `electron/main.cjs` reads a passing `ocean-fluid-calibration-profile-v1` profile and supplies `fluidTier=auto` plus `calibratedFluidTier` unless an explicit environment override is present |
| FG-24-T03 | FG-24 | Done | verification | `npm run fluid:persisted-calibration` passes with env calibrated tier absent, profile-selected `ultra`, main-process profile read, calibrated-auto runtime mode, selected grid `768 x 432`, and WebGPU renderer |
| FG-25-T01 | FG-25 | Done | calibration | `fluidInstalledCalibration.ts` installs a passing FG-23-derived `ocean-fluid-calibration-profile-v1` profile through the desktop storage helper and records a round-trip receipt |
| FG-25-T02 | FG-25 | Done | integration | `fluidInstalledCalibration.report.ts` launches the packaged app twice from the same installed `fluid-calibration.v1.json` with `OCEAN_LAB_FLUID_TIER` and `OCEAN_LAB_CALIBRATED_FLUID_TIER` absent |
| FG-25-T03 | FG-25 | Done | verification | `npm run fluid:installed-calibration` passes with installed tier `ultra`, reused main-process profile selection, two calibrated-auto runtime probes, selected grid `768 x 432`, and WebGPU renderer |
| FG-26-T01 | FG-26 | Done | performance | `fluidInstalledDisplayPacing.ts` wraps the display pacing gate with installed-profile, env-free, calibrated-auto ultra sample provenance checks |
| FG-26-T02 | FG-26 | Done | verification | `fluidInstalledDisplayPacing.report.ts` installs the calibration profile, launches the packaged app with no fluid-tier env vars, and samples idle, concrete-impact, and foam-damping pacing |
| FG-26-T03 | FG-26 | Done | performance | `npm run fluid:installed-display-pacing` passes with calibrated-auto ultra samples, selected grid `768 x 432`, WebGPU renderer, smooth frame pacing, and committed FG-26 evidence |
| FG-27-T01 | FG-27 | Done | calibration | `fluidPersistedCalibration.ts` writes `appVersion` plus FG-23 source evidence into `ocean-fluid-calibration-profile-v1` profiles and validates that provenance |
| FG-27-T02 | FG-27 | Done | integration | `electron/main.cjs` refuses missing, failed, malformed, or wrong-app-version calibration profiles before setting `calibratedFluidTier` |
| FG-27-T03 | FG-27 | Done | verification | `npm run fluid:calibration-freshness` passes with a current profile selecting calibrated-auto ultra and a stale app-version profile falling back to default high |
| FG-28-T01 | FG-28 | Done | calibration | `fluidPersistedCalibration.ts` writes FG-01 adapter, feature, limit, backend, status, and fingerprint provenance into `ocean-fluid-calibration-profile-v1` profiles |
| FG-28-T02 | FG-28 | Done | integration | `OceanPhysicsApp` compares the saved `calibratedFluidFingerprint` with the live WebGPU capability fingerprint and selects `calibration-provenance-fallback-high` on mismatch |
| FG-28-T03 | FG-28 | Done | verification | `npm run fluid:calibration-provenance` passes with matching calibrated-auto ultra, copied-profile high fallback, tampered-profile default-high fallback, and committed FG-28 evidence |
| FG-29-T01 | FG-29 | Done | performance | `fluidSustainedInteractionPacing.ts` requires a multi-action mixed-object workload, calibrated-auto ultra samples, WebGPU pressure/particles/coupling telemetry, smooth frame pacing, and zero fixed-step debt |
| FG-29-T02 | FG-29 | Done | verification | `fluidSustainedInteractionPacing.report.ts` installs the calibration profile, launches the packaged app with no fluid-tier environment variables, and samples concrete, foam, leaky-drum, and steel-sphere drops in one sustained run |
| FG-29-T03 | FG-29 | Done | performance | `npm run fluid:sustained-interaction-pacing` passes with calibrated-auto ultra, `768 x 432` WebGPU samples, active physics telemetry, smooth sustained pacing, and committed FG-29 evidence |
| FG-30-T01 | FG-30 | Done | packaging | `electron_zip_cache.mjs` finds the exact `electron-v42.3.3-darwin-arm64.zip` artifact in local Electron cache roots and `package_mac.mjs` passes `electron-zip-dir` when present |
| FG-30-T02 | FG-30 | Done | verification | `fluidPackageReproducibility.report.ts` rebuilds the package through `scripts/package_mac.mjs`, records the cached zip proof, and runs the sustained interaction report against the freshly packaged app |
| FG-30-T03 | FG-30 | Done | release | `npm run fluid:package-reproducibility` passes with a local cached Electron zip, packaged app path, calibrated-auto ultra runtime, smooth sustained pacing, and committed FG-30 evidence |
| FG-31-T01 | FG-31 | Done | diagnostics | `fluidImpactEnergyBudget.ts` computes impact kinetic energy and bounded pressure, splash, foam, potential, particle reentry, and mass-ratio channels from FG-22 live ultra telemetry |
| FG-31-T02 | FG-31 | Done | calibration | FG-31 source trace requires the NIST gravity source plus FG-06 calibration and FG-09 solver-architecture evidence through the structured reference dataset |
| FG-31-T03 | FG-31 | Done | verification | `npm run fluid:impact-energy-budget` passes with ultra `768 x 432` WebGPU telemetry, active pressure/particle/splash/coupling channels, no full-grid readback, and committed FG-31 evidence |
| FG-32-T01 | FG-32 | Done | diagnostics | `fluidSurfaceRecovery.ts` measures post-impact visual luma variance, color-bucket complexity, bright foam fraction, pressure work, foam energy, water-frame delta, fixed-step debt, and no-readback telemetry |
| FG-32-T02 | FG-32 | Done | verification | `fluidSurfaceRecovery.report.ts` launches the packaged ultra renderer, drops an 8 m concrete cube into a 22 m calm tank, and samples five post-impact WebGPU canvas screenshots |
| FG-32-T03 | FG-32 | Done | physics | `npm run fluid:surface-recovery` passes with visual stddev, color-bucket, pressure-work, and foam-energy recovery ratios under thresholds plus committed FG-32 evidence |
| FG-33-T01 | FG-33 | Done | release | `fluidDesktopLauncher.ts` requires an install root outside the workspace, a Desktop symlink that resolves to the app bundle, codesign verification, clean signing-relevant xattrs, and nonblank WebGPU render evidence |
| FG-33-T02 | FG-33 | Done | verification | `fluidDesktopLauncher.report.ts` packages to `~/Applications/Ocean Impact Lab Builds`, verifies `/Users/sasha/Desktop/Ocean Impact Lab.app`, and runs `fluid_render_probe.mjs` through that exact launcher executable with default user data |
| FG-33-T03 | FG-33 | Done | release | `npm run fluid:desktop-launcher` passes with a signed app bundle, clean Desktop symlink target, nonblank/varied WebGPU pixels, and committed FG-33 evidence |
| FG-34-T01 | FG-34 | Done | calibration | `fluidDefaultProfileCalibration.ts` requires real Ocean Impact Lab default storage, a valid FG-23 calibration profile, no fluid-tier environment overrides, calibrated-auto ultra selection, and nonblank WebGPU pixels |
| FG-34-T02 | FG-34 | Done | storage | `fluidDefaultProfileCalibration.report.ts` writes `fluid-calibration.v1.json` into `/Users/sasha/Library/Application Support/Ocean Impact Lab/harborline-game` and verifies the profile round-trip |
| FG-34-T03 | FG-34 | Done | verification | `npm run fluid:default-profile-calibration` launches `/Users/sasha/Desktop/Ocean Impact Lab.app` without fluid-tier env overrides and proves calibrated-auto ultra on the `768 x 432` WebGPU renderer |
| FG-35-T01 | FG-35 | Done | release | `fluidDesktopVisibility.ts` requires FG-34 calibrated-auto ultra evidence, an installed-bundle process, a visible frontmost Ocean Impact Lab window, and nonblank/varied ocean viewport pixels |
| FG-35-T02 | FG-35 | Done | verification | `fluidDesktopVisibility.report.ts` opens `/Users/sasha/Desktop/Ocean Impact Lab.app` through macOS `open`, foregrounds the app, captures the visible window, and samples the ocean viewport crop |
| FG-35-T03 | FG-35 | Done | release | `npm run fluid:desktop-visibility` passes with the installed calibrated process, a frontmost visible window, and committed nonblack ocean viewport evidence |
| FG-36-T01 | FG-36 | Done | calibration | `fluidInstalledReferenceOutcomes.ts` wraps the FG-22 reference comparison packet with default-profile, no-env-override, calibrated-auto ultra, Desktop launcher, pressure, particles, coupling, and no-readback checks |
| FG-36-T02 | FG-36 | Done | verification | `fluidInstalledReferenceOutcomes.report.ts` launches `/Users/sasha/Desktop/Ocean Impact Lab.app` with no fluid-tier or userData env overrides and drives concrete, ice, foam, concrete sink, and leaky-drum scenarios |
| FG-36-T03 | FG-36 | Done | calibration | `npm run fluid:installed-reference-outcomes` passes with calibrated-auto ultra, five live reference cases, ten comparisons, active WebGPU pressure/particles/coupling, and committed evidence |
| FG-37-T01 | FG-37 | Done | performance | `fluidInstalledReferencePacing.ts` requires passing FG-36 evidence, no fluid-tier or userData env overrides, calibrated-auto ultra `768 x 432` samples, WebGPU renderer/context, smooth frame pacing, pressure/particle/coupling telemetry where expected, and no full-grid readback |
| FG-37-T02 | FG-37 | Done | verification | `fluidInstalledReferencePacing.report.ts` launches `/Users/sasha/Desktop/Ocean Impact Lab.app` with no fluid-tier or userData env overrides and samples concrete drop/splash, ice float, foam damping, concrete sink, and leaky-drum sink pacing windows |
| FG-37-T03 | FG-37 | Done | calibration | `npm run fluid:installed-reference-pacing` passes with composed FG-36 reference evidence, calibrated-auto ultra runtime, five reference-category pacing scenarios, smooth p95/p99 frame pacing, active WebGPU telemetry, and committed evidence |
| FG-38-T01 | FG-38 | Done | compute | `fluidGridGpu`, `fluidShallowWater`, and `fluidParticleSplash` accept explicit benchmark `gridDimensions` while production `fluidGridTiers` and runtime selection remain capped at ultra |
| FG-38-T02 | FG-38 | Done | verification | `fluidHighResolutionHeadroom.report.ts` launches the packaged app and benchmarks `1024 x 576` and `1280 x 720` WebGPU grid, pressure-gradient shallow-water, and particle-splash workloads with timestamp queries |
| FG-38-T03 | FG-38 | Done | performance | `npm run fluid:high-resolution-headroom` passes with benchmark-only grids larger than ultra, bounded p95 GPU timing, bounded wall timing, memory below local storage limits, no full-grid readback, and committed evidence |
| FG-39-T01 | FG-39 | Done | renderer | `electron/main.cjs` accepts only benchmark-approved `OCEAN_LAB_EXPERIMENTAL_FLUID_GRID` values and `OceanPhysicsApp` passes the parsed runtime grid override into `createFluidWaterRenderer` |
| FG-39-T02 | FG-39 | Done | verification | `fluidExperimentalLiveGrid.report.ts` launches the packaged app with `OCEAN_LAB_FLUID_TIER=ultra` and `OCEAN_LAB_EXPERIMENTAL_FLUID_GRID=1024x576`, then waits for the canvas to report a live `1024 x 576` WebGPU grid |
| FG-39-T03 | FG-39 | Done | performance | `npm run fluid:experimental-live-grid` passes with smooth idle and concrete-impact display pacing on the live high-resolution grid plus committed FG-39 evidence |
| FG-40-T01 | FG-40 | Done | physics | `fluidExperimentalReferenceOutcomes.ts` requires capability selection to remain ultra `768 x 432` while the live renderer grid is `1024 x 576` and all reference comparisons, pressure, particle, coupling, frame-loop, and no-readback telemetry pass |
| FG-40-T02 | FG-40 | Done | verification | `fluidExperimentalReferenceOutcomes.report.ts` launches the packaged app with `OCEAN_LAB_FLUID_TIER=ultra` and `OCEAN_LAB_EXPERIMENTAL_FLUID_GRID=1024x576`, then replays concrete drop/splash, ice float, foam damping, concrete sink, and leaky-drum sink reference cases |
| FG-40-T03 | FG-40 | Done | calibration | `npm run fluid:experimental-reference-outcomes` passes with all reference comparison bands, active WebGPU telemetry, fixed-step frame-loop stats, no-readback proof, and committed FG-40 evidence |
| FG-41-T01 | FG-41 | Done | calibration | `fluidPersistedCalibration.ts` validates an optional `runtimeGrid` profile field sourced from passing FG-40 evidence while existing tier-only profiles remain valid |
| FG-41-T02 | FG-41 | Done | startup | `electron/main.cjs` reads the stored `runtimeGrid` profile field and forwards `experimentalFluidGrid=1024x576` when no manual grid environment override is present |
| FG-41-T03 | FG-41 | Done | verification | `npm run fluid:high-resolution-calibration` passes with a stored FG-40 runtime grid, no fluid/grid env overrides, calibrated-auto ultra capability, and a live `1024 x 576` WebGPU canvas |
| FG-42-T01 | FG-42 | Done | calibration | `fluidInstalledHighResolutionReferencePacing.report.ts` writes a provenance-valid FG-23 profile with FG-40 `runtimeGrid` into `/Users/sasha/Library/Application Support/Ocean Impact Lab/harborline-game/fluid-calibration.v1.json` |
| FG-42-T02 | FG-42 | Done | verification | `fluidInstalledHighResolutionReferencePacing.report.ts` launches `/Users/sasha/Desktop/Ocean Impact Lab.app` without `OCEAN_LAB_FLUID_TIER`, `OCEAN_LAB_CALIBRATED_FLUID_TIER`, `OCEAN_LAB_EXPERIMENTAL_FLUID_GRID`, or `HARBORLINE_USER_DATA_DIR` and replays concrete drop/splash, ice float, foam damping, concrete sink, and leaky-drum sink at live `1024 x 576` |
| FG-42-T03 | FG-42 | Done | performance | `npm run fluid:installed-high-resolution-reference-pacing` passes with five reference pacing scenarios at ~`120 FPS`, max p95 `9.20 ms`, max p99 `9.30 ms`, zero dropped-frame ratio, active WebGPU pressure/particles/coupling, and no full-grid readback |
| FG-43-T01 | FG-43 | Done | calibration | `fluidInstalledHighResolutionFloatSinkEnvelope.ts` requires every object preset, all three prediction outcomes, default high-resolution storage, calibrated-auto ultra runtime, live `1024 x 576` WebGPU samples, active pressure/particles/coupling, no full-grid readback, and nonblack viewport pixels |
| FG-43-T02 | FG-43 | Done | verification | `fluidInstalledHighResolutionFloatSinkEnvelope.report.ts` launches `/Users/sasha/Desktop/Ocean Impact Lab.app` without fluid-tier, grid, or userData env overrides, captures the high-resolution WebGPU canvas, and records float/sink prediction plus live phase evidence for foam, pine, ice, drum, hardwood, concrete, steel, and aluminum presets |
| FG-43-T03 | FG-43 | Done | performance | `npm run fluid:installed-high-resolution-float-sink` passes with eight presets, stable floaters, immediate sinkers, accelerated waterlogging threshold proof, high-resolution viewport luma `124.27` with `27` color buckets, max p95 `9.20 ms`, max p99 `9.40 ms`, worst dropped-frame ratio `0.0011`, and committed FG-43 evidence |
| FG-44-T01 | FG-44 | Done | release | `fluidInstalledHighResolutionDesktopVisibility.ts` requires passing FG-43 high-resolution evidence, default runtime-grid storage, the installed Desktop bundle process, a visible frontmost window, and nonblank/varied ocean viewport pixels |
| FG-44-T02 | FG-44 | Done | verification | `fluidInstalledHighResolutionDesktopVisibility.report.ts` opens `/Users/sasha/Desktop/Ocean Impact Lab.app` through macOS `open`, foregrounds it, screenshots the visible display, crops the ocean viewport, and ties the proof to fresh FG-43 source evidence |
| FG-44-T03 | FG-44 | Done | release | `npm run fluid:installed-high-resolution-desktop-visibility` passes with a normal visible Desktop launch, source FG-43 live `1024 x 576` evidence, and committed nonblack high-resolution viewport evidence |
| FG-45-T01 | FG-45 | Done | release | `fluidInstalledHighResolutionOperatorReadout.ts` requires fresh FG-44 visibility evidence, live `1024 x 576` WebGPU runtime, visible preset and Drop clicks, synchronized Float Result, Float Timing, impact, splash, renderer, and no-readback telemetry for float, sink, and waterlogging outcomes |
| FG-45-T02 | FG-45 | Done | verification | `fluidInstalledHighResolutionOperatorReadout.report.ts` launches `/Users/sasha/Desktop/Ocean Impact Lab.app` without fluid-tier, grid, or userData env overrides, clicks the actual preset buttons and Drop control, and scrapes the visible readout panels against live physics snapshots |
| FG-45-T03 | FG-45 | Done | release | `npm run fluid:installed-high-resolution-operator-readout` passes with source FG-44 visible-screen proof, live `1024 x 576` WebGPU runtime, operator-driven foam `Floating for 3.3 s`, concrete `Sinking now`, leaky drum predicted `3.1 hr`, max p95 `9.70 ms`, max p99 `10.30 ms`, zero dropped/duplicate frame ratios, and committed FG-45 evidence |
| FG-46-T01 | FG-46 | Done | calibration | `fluidInstalledHighResolutionResidualBudget.ts` consumes FG-42 and FG-45 evidence, computes normalized residuals plus nearest-bound margins, and rejects missing categories, tolerance-edge comparisons, UI-only readouts, fallback grids, and lost no-readback provenance |
| FG-46-T02 | FG-46 | Done | verification | `fluidInstalledHighResolutionResidualBudget.report.ts` reads committed FG-42 reference pacing and FG-45 operator readout evidence, writes `reports/fluid-installed-high-resolution-residual-budget-latest.json`, and summarizes worst residual plus closest margin |
| FG-46-T03 | FG-46 | Done | calibration | `npm run fluid:installed-high-resolution-residual-budget` passes with 10 structured comparisons across drop, splash, float, sink, and damping, live `1024 x 576` WebGPU provenance, no-readback proof, closest margin above the gate threshold, and committed FG-46 evidence |
| FG-47-T01 | FG-47 | Done | release | `fluidInstalledHighResolutionVisualWatchdog.ts` consumes FG-46 evidence and rejects blank, flat, stale, fallback, readback, and UI-only visual samples across idle and post-drop high-resolution WebGPU frames |
| FG-47-T02 | FG-47 | Done | verification | `fluidInstalledHighResolutionVisualWatchdog.report.ts` installs the default high-resolution profile, launches `/Users/sasha/Desktop/Ocean Impact Lab.app`, captures idle and post-drop canvas screenshots, and records pixel probes with advancing water-frame telemetry |
| FG-47-T03 | FG-47 | Done | release | `npm run fluid:installed-high-resolution-visual-watchdog` passes with multiple nonblank varied `1024 x 576` WebGPU samples, advancing water frames, post-drop active physics telemetry, no-readback proof, and committed FG-47 evidence |
| FG-48-T01 | FG-48 | Done | calibration | `fluidInstalledHighResolutionTargetResiduals.ts` consumes FG-46 and FG-47 evidence, classifies each comparison as `target-midpoint`, `lower-is-better`, or `exact`, and separates target error from tolerance-edge margin |
| FG-48-T02 | FG-48 | Done | verification | `fluidInstalledHighResolutionTargetResiduals.report.ts` reads committed FG-46 residual-budget evidence and FG-47 visual-watchdog evidence, writes `reports/fluid-installed-high-resolution-target-residuals-latest.json`, and summarizes objective counts, worst target error, closest tolerance margin, and watch lists |
| FG-48-T03 | FG-48 | Done | calibration | `npm run fluid:installed-high-resolution-target-residuals` passes with 10 classified comparisons across drop, splash, float, sink, and damping, live `1024 x 576` WebGPU source/visual provenance, lower-is-better zero targets, exact phase/window checks, and committed FG-48 evidence |
| FG-49-T01 | FG-49 | Done | release | `electron/main.cjs` applies `HARBORLINE_USER_DATA_DIR` before `app.requestSingleInstanceLock`, and `electron/main.test.mjs` fails if temporary-profile diagnostics can collide with the default-profile Desktop lock again |
| FG-49-T02 | FG-49 | Done | verification | `fluidDesktopProbeIsolation.report.ts` keeps a default-profile packaged Ocean Impact Lab instance alive, launches `scripts/fluid_render_probe.mjs` against the same packaged executable with temporary userData, and records the temporary probe report path, exit code, telemetry, and pixel proof |
| FG-49-T03 | FG-49 | Done | release | `npm run fluid:desktop-probe-isolation` passes with default app WebGPU telemetry, temporary userData render evidence, source-order proof, and committed FG-49 evidence |
| FG-50-T01 | FG-50 | Done | calibration | `fluidHighResolutionCalibrationFrontier.ts` consumes FG-48 evidence, ranks `targetErrorRatio` values, preserves tolerance-margin no-regression guards, and identifies near-frontier comparison ids |
| FG-50-T02 | FG-50 | Done | calibration | `fluidHighResolutionCalibrationFrontier.ts` classifies `live-foam-settled-buoyancy-error` as a `physics-tuning-candidate` and `live-drop-speed-reference` as a `reference-target-review` before any free-fall drag tuning |
| FG-50-T03 | FG-50 | Done | verification | `npm run fluid:high-resolution-calibration-frontier` passes with committed FG-50 evidence, FG-48/G-FG-47 provenance, no-regression guards, and the next calibration action list |

## GitHub Labels

- `fluid-grid`
- `webgpu`
- `physics`
- `renderer`
- `gate`
- `calibration`
- `blocked`

## GitHub Issue Map

| ID | Issue |
| --- | --- |
| FG-00 | https://github.com/AC-21/ocean/issues/2 |
| FG-01 | https://github.com/AC-21/ocean/issues/3 |
| FG-02 | https://github.com/AC-21/ocean/issues/4 |
| FG-03 | https://github.com/AC-21/ocean/issues/5 |
| FG-04 | https://github.com/AC-21/ocean/issues/6 |
| FG-05 | https://github.com/AC-21/ocean/issues/7 |
| FG-06 | https://github.com/AC-21/ocean/issues/8 |
| FG-07 | https://github.com/AC-21/ocean/issues/10 |
| FG-08 | https://github.com/AC-21/ocean/issues/11 |
| FG-09 | https://github.com/AC-21/ocean/issues/12 |
| FG-10 | https://github.com/AC-21/ocean/issues/13 |
| FG-11 | https://github.com/AC-21/ocean/issues/14 |
| FG-12 | https://github.com/AC-21/ocean/issues/15 |
| FG-13 | https://github.com/AC-21/ocean/issues/16 |
| FG-14 | https://github.com/AC-21/ocean/issues/17 |
| FG-15 | https://github.com/AC-21/ocean/issues/18 |
| FG-16 | https://github.com/AC-21/ocean/issues/19 |
| FG-17 | https://github.com/AC-21/ocean/issues/20 |
| FG-18 | https://github.com/AC-21/ocean/issues/21 |
| FG-19 | https://github.com/AC-21/ocean/issues/22 |
| FG-20 | https://github.com/AC-21/ocean/issues/23 |
| FG-21 | https://github.com/AC-21/ocean/issues/24 |
| FG-22 | https://github.com/AC-21/ocean/issues/25 |
| FG-23 | https://github.com/AC-21/ocean/issues/26 |
| FG-24 | https://github.com/AC-21/ocean/issues/27 |
| FG-25 | https://github.com/AC-21/ocean/issues/28 |
| FG-26 | https://github.com/AC-21/ocean/issues/29 |
| FG-27 | https://github.com/AC-21/ocean/issues/30 |
| FG-28 | https://github.com/AC-21/ocean/issues/31 |
| FG-29 | https://github.com/AC-21/ocean/issues/32 |
| FG-30 | https://github.com/AC-21/ocean/issues/33 |
| FG-31 | https://github.com/AC-21/ocean/issues/34 |
| FG-32 | https://github.com/AC-21/ocean/issues/35 |
| FG-33 | https://github.com/AC-21/ocean/issues/36 |
| FG-34 | https://github.com/AC-21/ocean/issues/37 |
| FG-35 | https://github.com/AC-21/ocean/issues/38 |
| FG-36 | https://github.com/AC-21/ocean/issues/39 |
| FG-37 | https://github.com/AC-21/ocean/issues/40 |
| FG-38 | https://github.com/AC-21/ocean/issues/41 |
| FG-39 | https://github.com/AC-21/ocean/issues/42 |
| FG-40 | https://github.com/AC-21/ocean/issues/43 |
| FG-41 | https://github.com/AC-21/ocean/issues/44 |
| FG-42 | https://github.com/AC-21/ocean/issues/45 |
| FG-43 | https://github.com/AC-21/ocean/issues/46 |
| FG-44 | https://github.com/AC-21/ocean/issues/47 |
| FG-45 | https://github.com/AC-21/ocean/issues/48 |
| FG-46 | https://github.com/AC-21/ocean/issues/49 |
| FG-47 | https://github.com/AC-21/ocean/issues/50 |
| FG-48 | https://github.com/AC-21/ocean/issues/51 |
| FG-49 | https://github.com/AC-21/ocean/issues/53 |
| FG-50 | https://github.com/AC-21/ocean/issues/54 |
| SEC-00 | https://github.com/AC-21/ocean/issues/9 |

## Remote Status

Remote `origin` is configured as `https://github.com/AC-21/ocean.git`, and
local `main` tracks `origin/main`.

The `gh` CLI can create and close issues for this repo in the current local
session; use Git credential-backed `git push` for commits and `gh issue` for
milestone gate tracking.
