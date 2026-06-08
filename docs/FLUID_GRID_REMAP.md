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

FG-03 is complete as of 2026-06-07. `npm run fluid:render` launched the local
Electron app, waited for WebGPU water frames, captured the stage canvas, decoded
the screenshot pixels, and wrote `reports/fluid-render-probe-latest.json`. A
committed snapshot is stored at
`docs/evidence/FG-03-fluid-render-probe-2026-06-07.json`.

Latest render evidence:

- Renderer: `webgpu-grid-primary-v1`.
- Canvas context: `webgpu`.
- Grid: `512 x 288`, tier `high`.
- Frames observed: `54`.
- Pixel probe: `nonblank/varied`, `22` color buckets, average luma `122.86`.
- Legacy Canvas 2D: not the primary renderer; it remains diagnostic fallback
  only.
- Gate: passed.

FG-04 is complete as of 2026-06-07. `npm run fluid:coupling` launched the local
Electron app, dropped the concrete cube, waited for active WebGPU object-grid
coupling, and wrote `reports/fluid-coupling-latest.json`. A committed snapshot
is stored at `docs/evidence/FG-04-fluid-coupling-2026-06-07.json`.

Latest coupling evidence:

- Renderer: `webgpu-grid-primary-v1`.
- Canvas context: `webgpu`.
- Grid: `512 x 288`, tier `high`.
- Coupling: `object-grid-v1`, active during the drop.
- Footprint: `141` bounded local grid samples.
- Displacement impulse: `0.63824` from canvas telemetry,
  `0.6382397275991559` from renderer stats.
- Force feedback: finite vertical force delta `2373.45 N` and horizontal force
  delta `0.16 N` consumed by the next rigid-body physics step.
- Full-grid readback: none per frame.
- Gate: passed.

FG-05 is complete as of 2026-06-07. `npm run fluid:splash` launched the local
Electron app, dropped the concrete cube, waited for active WebGPU grid-splash
coupling, then waited for droplet reentry energy to be coupled back into the
grid. A committed snapshot is stored at
`docs/evidence/FG-05-fluid-splash-2026-06-07.json`.

Latest splash evidence:

- Renderer: `webgpu-grid-primary-v1`.
- Canvas context: `webgpu`.
- Grid: `512 x 288`, tier `high`.
- Coupling: `grid-splash-v1`, active during the drop.
- Local grid energy: `8019.9816 J` from telemetry during active splash,
  `8019.9815731786875 J` from renderer stats.
- Foam: `4325` bounded local grid samples, `5774.3867 J` telemetry foam energy.
- Spray: `198` droplets from telemetry, crown height `1.5532 m`.
- Secondary reentry: accumulated reentry energy `0.009412 J` coupled back to
  grid telemetry.
- Full-grid readback: none per frame.
- Gate: passed.

FG-06 is complete as of 2026-06-07. `npm run fluid:calibration` ran the final
near-realism calibration packet and wrote `reports/fluid-calibration-latest.json`.
A committed snapshot is stored at
`docs/evidence/FG-06-fluid-calibration-2026-06-07.json`.

Latest calibration evidence:

- Calibration cases: `7`, all passed.
- Prior WebGPU evidence checks: `5`, all passed.
- Dense-object impact: concrete cube from `8 m` entered at `12.1641 m/s`,
  inside the `sqrt(2gh)` free-fall bound.
- Timestep convergence: coarse/fine impact-speed delta `0.0782 m/s`; impact
  time delta `0.0066 s`.
- Static draft: fresh-water ice submerged fraction `0.8946`, matching density
  ratio.
- Float settling: foam block settled with draft error `0.0109 m` and buoyancy
  error `0.0174`.
- Splash height: high-Weber concrete impact produced `2.0805 m`, inside the
  accepted ballistic-head band.
- Waterlogging sensitivity: larger leak sink-time ratio `0.2233`.
- Underwater terminal velocity: concrete cube `4.0067 m/s`.
- Gate: passed.

FG-07 is complete as of 2026-06-08. It exists because smooth local performance is a
separate proof from physics-formula coverage. The previous grid benchmark
proved a compute pass can run quickly, but it did not prove that the packaged
desktop app has stable frame pacing while the object, water renderer, coupling,
React readouts, and WebGPU command submission all run together.

Latest local calibration direction:

- Command: `npm run fluid:local-calibrate`.
- Packaged-app command: `npm run fluid:local-calibrate:packaged`.
- Report: `reports/fluid-local-calibration-latest.json`.
- Gate: `G-FG-07`.
- Required evidence: WebGPU renderer telemetry, local adapter/device limits,
  high-tier grid timing, timestamp-query GPU samples when the adapter exposes
  `timestamp-query`, idle/drop frame-pacing summaries, and the runtime launch
  mode (`electron-source` or `packaged-app`).
- Frame-pacing thresholds: average FPS at least `55`, p95 frame time at most
  `24 ms`, p99 frame time at most `36 ms`, dropped-frame ratio at most `6%`,
  and duplicate water-frame ratio at most `12%`.
- Latest packaged result: passed.
- Runtime: `packaged-app`.
- High-tier wall-clock grid timing: `0.0683 ms/step`.
- High-tier WebGPU timestamp-query timing: `0.0244 ms/step` average,
  `0.0271 ms` p95 across `120` samples.
- Idle scenario: `120.0 FPS`, p95 `9.3 ms`, p99 `9.4 ms`, no dropped frames.
- Concrete-cube drop scenario: `120.0 FPS`, p95 `9.3 ms`, p99 `9.4 ms`, no
  dropped frames.
- Evidence snapshot:
  `docs/evidence/FG-07-local-calibration-2026-06-08.json`.
- Status: passed as an automated packaged-app baseline. If the user still sees
  choppiness by eye, the next gate must add manual/display-specific capture
  evidence instead of assuming the automated run covers that path.

Research notes:

- WebGPU timestamp queries are the right local instrumentation when available:
  MDN documents that timestamp queries write pass timing into a `GPUQuerySet`,
  and the WebGPU spec defines `timestampWrites` for compute passes.
- The graphics-fluid direction remains a hybrid real-time solver rather than
  full offline CFD: grid-based water for broad surface state, plus local
  particle/splash layers for high-energy impact detail.

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
8. Local performance calibration: measure the real desktop app on the local GPU
   before accepting any near-realism claim.

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
- Local desktop frame-pacing evidence proving the simulator runs smoothly on the
  user's machine at the selected tier.
