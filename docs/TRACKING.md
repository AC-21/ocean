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
| SEC-00 | https://github.com/AC-21/ocean/issues/9 |

## Remote Status

Remote `origin` is configured as `https://github.com/AC-21/ocean.git`, and
local `main` tracks `origin/main`.

The `gh` CLI still reports invalid account tokens, so use Git credential-backed
`git push` or re-authenticate with `gh auth login -h github.com` before using
`gh issue`, `gh pr`, or `gh api` commands locally.
