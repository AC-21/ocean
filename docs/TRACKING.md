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
| FG-04 | Two-way rigid-body/fluid coupling | Planned | G-FG-04 |
| FG-05 | Splash, foam, and spray from grid state | Planned | G-FG-05 |
| FG-06 | Calibration and near-realism validation | Planned | G-FG-06 |

## Gates

| Gate | Blocks | Command or Evidence | Pass Bar |
| --- | --- | --- | --- |
| G-FG-00 | FG-00 | `npm run fluid:tracking` | docs, issue templates, and code contract agree on milestones and gates |
| G-FG-01 | FG-01 | `npm run fluid:capability`; `docs/evidence/FG-01-fluid-capability-2026-06-07.json` | adapter/device limits captured; unsupported hardware has intentional fallback |
| G-FG-02 | FG-02 | `npm run fluid:grid`; `docs/evidence/FG-02-fluid-grid-benchmark-2026-06-07.json` | standard grid steps inside frame budget with stable CFL and no full-grid readback |
| G-FG-03 | FG-03 | `npm run fluid:render`; `docs/evidence/FG-03-fluid-render-probe-2026-06-07.json` | WebGPU renderer is nonblank/varied and Canvas 2D is not the primary water path |
| G-FG-04 | FG-04 | drop-regression report | object entry, buoyancy, slam, drag, and float/sink state use grid-backed coupling |
| G-FG-05 | FG-05 | splash-regression report | splash crown, foam, spray, and secondary impacts are driven by local grid energy |
| G-FG-06 | FG-06 | calibration packet | reference cases match accepted error bounds for impact speed, splash height, damping, and float duration |

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
| FG-04-T01 | FG-04 | Planned | physics | Write object footprints and displacement impulses into the grid |
| FG-04-T02 | FG-04 | Planned | physics | Read bounded local grid samples into buoyancy, slam, drag, lift, and float logic |
| FG-04-T03 | FG-04 | Planned | verification | Compare CPU reference and GPU coupling on canonical drop cases |
| FG-05-T01 | FG-05 | Planned | physics | Generate foam/spray from Weber, Froude, energy, and grid-gradient state |
| FG-05-T02 | FG-05 | Planned | physics | Feed droplet reentry and entrained-air effects back into the grid |
| FG-05-T03 | FG-05 | Planned | verification | Validate splash crown, spray mass, and secondary impacts against references |
| FG-06-T01 | FG-06 | Planned | calibration | Collect reference drop footage and material/shape cases |
| FG-06-T02 | FG-06 | Planned | calibration | Define accepted error bounds for splash, damping, float time, and sink time |
| FG-06-T03 | FG-06 | Planned | release | Close near-realism gate only with current reports and recorded evidence |

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
| SEC-00 | https://github.com/AC-21/ocean/issues/9 |

## Remote Status

Remote `origin` is configured as `https://github.com/AC-21/ocean.git`, and
local `main` tracks `origin/main`.

The `gh` CLI still reports invalid account tokens, so use Git credential-backed
`git push` or re-authenticate with `gh auth login -h github.com` before using
`gh issue`, `gh pr`, or `gh api` commands locally.
