# Fluid Remap Tracking

This file is the local source of truth until the GitHub remote exists. When the
remote is created, seed these as GitHub milestones and issues.

## Milestones

| ID | Milestone | Status | Exit Gate |
| --- | --- | --- | --- |
| FG-00 | Repository and tracking foundation | In progress | G-FG-00 |
| FG-01 | WebGPU capability shell | Planned | G-FG-01 |
| FG-02 | GPU grid allocation and stepping | Planned | G-FG-02 |
| FG-03 | Grid-backed water rendering | Planned | G-FG-03 |
| FG-04 | Two-way rigid-body/fluid coupling | Planned | G-FG-04 |
| FG-05 | Splash, foam, and spray from grid state | Planned | G-FG-05 |
| FG-06 | Calibration and near-realism validation | Planned | G-FG-06 |

## Gates

| Gate | Blocks | Command or Evidence | Pass Bar |
| --- | --- | --- | --- |
| G-FG-00 | FG-00 | `npm run fluid:tracking` | docs, issue templates, and code contract agree on milestones and gates |
| G-FG-01 | FG-01 | WebGPU capability report artifact | adapter/device limits captured; unsupported hardware has intentional fallback |
| G-FG-02 | FG-02 | GPU grid benchmark report | standard grid steps inside frame budget with stable CFL and no full-grid readback |
| G-FG-03 | FG-03 | render probe plus performance report | WebGPU renderer is nonblank/varied and Canvas 2D is not the primary water path |
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
| FG-01-T01 | FG-01 | Planned | capability | Detect `navigator.gpu`, adapter name, feature limits, and device creation errors |
| FG-01-T02 | FG-01 | Planned | architecture | Add `FluidBackend` abstraction with WebGPU and deterministic CPU implementations |
| FG-01-T03 | FG-01 | Planned | diagnostics | Show backend, adapter, tier, grid size, and fallback reason in-app |
| FG-02-T01 | FG-02 | Planned | compute | Allocate height, velocity, foam, obstacle, depth, and impulse buffers |
| FG-02-T02 | FG-02 | Planned | compute | Implement fixed-substep advection/propagation/damping compute passes |
| FG-02-T03 | FG-02 | Planned | verification | Add CFL, energy, and frame-budget checks for low/standard/high tiers |
| FG-03-T01 | FG-03 | Planned | renderer | Replace primary water renderer with WebGPU texture/mesh shading |
| FG-03-T02 | FG-03 | Planned | renderer | Keep legacy Canvas 2D behind explicit diagnostic mode only |
| FG-03-T03 | FG-03 | Planned | verification | Add nonblank/varied WebGPU render probe and no-primary-canvas assertion |
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
