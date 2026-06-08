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
| SEC-00 | https://github.com/AC-21/ocean/issues/9 |

## Remote Status

Remote `origin` is configured as `https://github.com/AC-21/ocean.git`, and
local `main` tracks `origin/main`.

The `gh` CLI still reports invalid account tokens, so use Git credential-backed
`git push` or re-authenticate with `gh auth login -h github.com` before using
`gh issue`, `gh pr`, or `gh api` commands locally.
