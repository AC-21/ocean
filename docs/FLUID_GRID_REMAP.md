# Fluid Grid Remap

Date: 2026-06-07

## Decision

Ocean Impact Lab is moving away from Canvas 2D as the primary simulation and
rendering path. The target engine is a WebGPU-first fluid grid with compute
passes for water state, rigid-body coupling, splash injection, and rendering.

Canvas 2D can remain only as a legacy diagnostic or temporary fallback while
the remap is in progress. It is not an acceptable production target for the
near-realistic simulator because high-resolution fluid grids need GPU memory,
parallel compute, and explicit frame-budget control.

## Target Engine Shape

The target is a real-time engineering fluid simulator, not a full offline CFD
solver. The first production-grade path should be a 2.5D free-surface solver:

- A height/velocity grid for the visible water surface.
- WebGPU compute passes for advection, pressure/projection, damping, boundary
  handling, impact displacement, and wave propagation.
- A particle layer for spray, foam, secondary droplets, and entrained air.
- Two-way coupling with dropped rigid bodies through displaced volume,
  momentum exchange, added mass, drag, and slam impulses.
- A renderer that reads GPU buffers/textures directly instead of redrawing the
  simulation through Canvas 2D.
- CPU deterministic fixtures for tests, calibration, and low-power proof, with
  the production backend remaining WebGPU.

This is a deliberate middle path. A full 3D Navier-Stokes volume solver is too
heavy for interactive design iteration, but a Canvas 2D approximation cannot
support the high-resolution grid behavior the product now needs.

## Backend Contract

Production backend:

- API: WebGPU, via `navigator.gpu`.
- Primary canvas context: `webgpu`.
- Compute: required.
- Data ownership: GPU buffers/textures own grid state for each frame.
- Readback: bounded diagnostics only, not full-grid every frame.
- Fallback: CPU deterministic test backend may prove math, but cannot close the
  production realism gate.

Forbidden for production:

- Canvas 2D as the simulation renderer.
- Per-pixel CPU drawing for the water field.
- Full-grid GPU readback every frame.
- Visual-only waves that do not feed buoyancy, slam, drag, and splash coupling.

## Current Capability Evidence

FG-01 is complete as of 2026-06-07. `npm run fluid:capability` launched the
local Electron app and wrote `reports/fluid-capability-latest.json`. A committed
snapshot is stored at `docs/evidence/FG-01-fluid-capability-2026-06-07.json`.

Latest evidence:

- Status: `webgpu-ready`.
- Backend: `webgpu-compute`.
- Adapter: `apple / metal-3`.
- Selected tier: `high`, `512 x 288`.
- Estimated grid memory: `4,718,592` bytes for the shell's eight-buffer grid
  budget.
- Storage-buffer binding limit: `134,217,728` bytes.
- Compute invocation limit: `256`.
- Fallback: none.

FG-02 is complete as of 2026-06-07. `npm run fluid:grid` launched the local
Electron app, allocated WebGPU storage buffers, ran the WGSL compute stepper,
and wrote `reports/fluid-grid-benchmark-latest.json`. A committed snapshot is
stored at `docs/evidence/FG-02-fluid-grid-benchmark-2026-06-07.json`.

Latest grid evidence:

- Standard grid: `256 x 144`, seven storage buffers, `120` compute steps,
  `0.6008 ms/step`, CFL `0.566`, max height `0.00393 m`, no full-grid readback
  per frame.
- High grid: `512 x 288`, seven storage buffers, `80` compute steps,
  `0.0462 ms/step`, CFL `0.566`, max height `0.01284 m`, no full-grid readback
  per frame.
- Allocated fields: height, height scratch, velocity, foam, obstacle, depth,
  and impulse.
- Gate: passed.

## Solver Stages

1. Capability gate: detect WebGPU, report adapter/device limits, and choose a
   resolution ladder from measured budget.
2. Grid allocation: create surface height, horizontal velocity, vertical
   impulse, foam, and obstacle/depth buffers.
3. Compute stepping: run stable advection, propagation, damping, and boundary
   passes at a fixed simulation substep.
4. Rigid-body coupling: write body footprint, displaced volume, entry impulse,
   and momentum exchange into the grid.
5. Splash coupling: spawn GPU-informed spray particles and write secondary
   impacts back into the free surface.
6. Rendering: shade water from height/normal/foam buffers, with debug overlays
   for grid cells, energy, CFL, and coupling impulses.
7. Calibration: compare drop height, impact speed, splash crown height, float
   duration, and damping curves against reference footage or lab data.

## Resolution Ladder

The solver should scale by measured budget rather than hard-coded optimism.

| Tier | Grid | Primary Use | Minimum Gate |
| --- | --- | --- | --- |
| Low | 128 x 72 | compatibility fallback | 30 FPS, nonblank, stable diagnostics |
| Standard | 256 x 144 | default interactive mode | 45 FPS average on target desktop |
| High | 512 x 288 | realism inspection | 30 FPS average with stable CFL |
| Ultra | 768 x 432 or higher | benchmark and future hardware | opt-in only |

The app should expose the active tier and reason for fallback in diagnostics.

## Migration Strategy

The current TypeScript physics model is not thrown away. It becomes the
calibration and rigid-body reference layer while the water field moves to
WebGPU.

- Keep `src/physicsOcean.ts` as a CPU reference until GPU parity gates pass.
- Introduce a renderer/solver abstraction so the UI can choose WebGPU,
  deterministic CPU, or legacy diagnostic modes.
- Replace `.ocean-canvas` Canvas 2D drawing only after the WebGPU surface has
  a passing capability, performance, and nonblank-render gate.
- Do not call the remap complete until object drops, splash, float/sink
  duration, and surface recovery are all powered by the grid-backed engine.

## Completion Bar

Near-realism is not a single visual check. It requires:

- WebGPU production backend selected when supported.
- High-resolution grid stepping within frame budget.
- Two-way object/water coupling.
- Splash and foam generated from impact energy and local grid state.
- Float duration and sink behavior tied to material density, shape, leak rate,
  displaced volume, and surface state.
- Diagnostics proving energy, mass/volume behavior, CFL stability, and adapter
  limits.
- Calibration evidence against real drop footage or measured reference cases.
