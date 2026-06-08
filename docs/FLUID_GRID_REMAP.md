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

FG-08 is complete as of 2026-06-08. It hardens the simulation hot loop so
future higher-resolution solver work has a bounded timing contract instead of
variable render-sized physics steps.

Latest frame-loop evidence:

- Command: `npm run fluid:frame-loop`.
- Report: `reports/fluid-frame-loop-latest.json`.
- Gate: `G-FG-08`.
- Evidence snapshot: `docs/evidence/FG-08-frame-loop-2026-06-08.json`.
- Fixed physics step: `0.008333 s` (`120 Hz`).
- Max substep guard: `24` per frame.
- Concrete-cube drop sample: `420` active samples, `420` fixed physics steps,
  and `421` WebGPU water frames.
- Max observed substeps: `1 / 24` at normal speed.
- Max accumulated simulation debt: `0.00817 s`, under one fixed step.
- Dropped simulation debt: `0`.
- Renderer remained `webgpu-grid-primary-v1` with `webgpu` context.
- Gate: passed.

FG-09 is complete as of 2026-06-08. It locks the next solver direction before
more realism work lands. The decision is a hybrid GPU heightfield/free-surface
grid plus localized particle splash layer: broad water lives in WebGPU grid
buffers, while energetic object entry spawns bounded particles for spray, foam,
sheets, entrained air, and secondary reentry.

Latest solver architecture evidence:

- Command: `npm run fluid:architecture`.
- Report: `reports/fluid-solver-architecture-latest.json`.
- Gate: `G-FG-09`.
- Evidence snapshot:
  `docs/evidence/FG-09-solver-architecture-2026-06-08.json`.
- Recommended option: `hybrid-heightfield-particles`.
- Accepted core: WebGPU shallow-water/free-surface grid for broad waves, local
  particle layer for impact detail, CPU reference fixtures for calibration.
- Rejected as the immediate production path: full 3D Eulerian CFD, particle-only
  SPH/PBF water, and Stable-Fluids-style Eulerian water.
- Deferred as incomplete by itself: GPU heightfield-only water, because it lacks
  enough local detail for violent object-entry splashes.
- Follow-on gates: `G-FG-10` reference ingestion, `G-FG-11` conservative
  shallow-water upgrade, `G-FG-12` localized particle splash layer, and
  `G-FG-13` coupled packaged-app calibration.
- Gate: passed.

Primary sources encoded in the gate:

- [Stable Fluids](https://graphics.stanford.edu/courses/cs448-01-spring/papers/stam.pdf)
  for the stable semi-Lagrangian solver family and its large-timestep tradeoff.
- [Fluid Simulation, SIGGRAPH 2006 Course Notes](https://www.cs.ubc.ca/~rbridson/fluidsimulation/2006/fluids_notes.pdf)
  for full 3D flow, free surfaces, particle-in-cell methods, and solid-fluid
  coupling.
- [Real-time Simulation of Large Bodies of Water with Small Scale Details](https://matthias-research.github.io/pages/publications/hfFluid.pdf)
  for the heightfield-plus-particles water architecture and two-way body
  coupling.
- [Position Based Fluids](https://mmacklin.com/pbf_sig_preprint.pdf) for robust
  localized real-time particle-fluid splash behavior.
- [Efficient Shallow Water Simulations on GPUs](https://brodtkorb.org/files/publications/brodtkorb_gs11.pdf)
  for GPU shallow-water implementation, verification, and validation direction.
- [Rigid Body Interaction for Large-Scale Real-Time Water Simulation](https://onlinelibrary.wiley.com/doi/10.1155/2014/580154)
  for keeping rigid-body interaction explicit in the large-water solver path.

FG-10 is complete as of 2026-06-08. It creates the first source-backed
reference dataset ingestion and measurement harness so future solver work can
calibrate against a stable ledger instead of shifting visual expectations.

Latest reference dataset evidence:

- Command: `npm run fluid:references`.
- Dataset: `data/fluid-reference-cases.json`.
- Report: `reports/fluid-reference-dataset-latest.json`.
- Gate: `G-FG-10`.
- Evidence snapshot:
  `docs/evidence/FG-10-reference-dataset-2026-06-08.json`.
- Coverage: drop, splash, float, sink, and damping behavior.
- Measurements: water-entry speed, hydrostatic draft, damped settling draft,
  damped buoyancy error, splash crown height, leak-area sink-time sensitivity,
  and underwater terminal speed.
- Required metadata: source IDs, units, uncertainty notes, replay methods, and
  resolved expected formulas or fixed bands.
- Replay path: the current CPU reference model evaluates every measurement and
  records actual values plus pass/fail.
- Gate: passed.

Source families encoded in the FG-10 dataset:

- [NIST standard gravity](https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8)
  for the standard free-fall acceleration.
- [USGS water density](https://www.usgs.gov/water-science-school/science/water-density)
  for fresh-water density and ice/floating-density context.
- [OpenStax Archimedes' principle](https://openstax.org/books/university-physics-volume-1/pages/14-4-archimedes-principle-and-buoyancy)
  for buoyancy and submerged-fraction relationships.
- [NASA drag equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/)
  and [NASA flight equations with drag](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/flight-equations-with-drag/)
  for drag and terminal-velocity reference formulas.
- [NOAA World Ocean Atlas density notes](https://www.nodc.noaa.gov/OC5/woa13/woa-info.html)
  for keeping seawater-density assumptions explicit.

FG-11 is complete as of 2026-06-08. It upgrades the broad-water grid from a
visual wave benchmark toward a conservative shallow-water state: water height,
x momentum, y momentum, and dry-mask fields are stepped on WebGPU with bounded
end-of-run diagnostics.

Latest shallow-water evidence:

- Command: `npm run fluid:shallow-water`.
- Solver: `conservative-shallow-water-v1`.
- Report: `reports/fluid-shallow-water-latest.json`.
- Gate: `G-FG-11`.
- Evidence snapshot: `docs/evidence/FG-11-shallow-water-2026-06-08.json`.
- Standard tier: `256 x 144`, mass drift `0.000000`, momentum damping `0.463`,
  timestamp-query GPU average `0.0204 ms/step`.
- High tier: `512 x 288`, mass drift `0.000000`, momentum damping `0.561`,
  timestamp-query GPU average `0.0329 ms/step`.
- Wet/dry stability: dry-cell count stayed fixed, no dry cells leaked water,
  and no negative depths appeared in either tier.
- Readback: bounded end-of-run height/momentum diagnostics only; no per-frame
  full-grid readback.
- Gate: passed.

This is deliberately the conservative transport and damping baseline. The first
attempt with pressure-gradient acceleration failed the gate by creating large
mass drift and momentum growth near dry boundaries. FG-11 keeps that failure
useful by locking the stable conservative state first; a later gate should
reintroduce pressure-gradient acceleration only with the same mass, momentum,
wet/dry, and local timing evidence.

FG-12 is complete as of 2026-06-08. It adds the first localized particle layer
for impact splash detail on top of the broad WebGPU water state. The layer is
not a visual-only spray counter: particles are deterministically seeded from
displaced water mass, Weber/Froude impact state, and the FG-10 splash reference
band, stepped in WebGPU, and summarized with bounded mass, momentum, reentry,
foam, and local grid-feedback diagnostics.

Latest particle-splash evidence:

- Command: `npm run fluid:particles`.
- Solver: `localized-particle-splash-v1`.
- Report: `reports/fluid-particle-splash-latest.json`.
- Gate: `G-FG-12`.
- Evidence snapshot: `docs/evidence/FG-12-particle-splash-2026-06-08.json`.
- Standard tier: `2048` particles, crown `1.9606 m`, reentry energy
  `179.06 J`, timestamp-query GPU average `0.0143 ms/step`.
- High tier: `4096` particles, crown `1.9613 m`, reentry energy `179.18 J`,
  timestamp-query GPU average `0.0050 ms/step`.
- Physical bounds: spray mass stayed at `0.2123` of displaced water mass,
  particle launch momentum stayed below `0.008` of object impact momentum, mass
  drift was `0`, and no particle left the local splash bounds.
- Reference check: the predicted crown stayed inside the FG-10 reference splash
  band, a ballistic range of `0.8086 m` to `3.5148 m`.
- Grid feedback: both tiers wrote bounded secondary reentry summaries with
  `28` local feedback samples and nonzero foam injection.
- Readback: bounded end-of-run particle diagnostics only; no per-frame
  full-grid readback.
- Gate: passed.

FG-13 is complete as of 2026-06-08. It is the first coupled packaged-app
calibration packet: the command packages the local macOS app, launches that
packaged app for WebGPU/frame-pacing evidence, replays the source-backed
reference dataset, and composes the latest shallow-water and particle-splash
evidence into one pass/fail report.

Latest coupled calibration evidence:

- Command: `npm run fluid:coupled-calibrate`.
- Report: `reports/fluid-coupled-calibration-latest.json`.
- Gate: `G-FG-13`.
- Evidence snapshot: `docs/evidence/FG-13-coupled-calibration-2026-06-08.json`.
- Runtime: packaged macOS app with renderer `webgpu-grid-primary-v1` and
  context `webgpu`.
- Frame pacing: idle high-tier `119.98 FPS`; concrete-cube drop `120.09 FPS`;
  both packaged scenarios passed smoothness thresholds.
- Reference replay: drop, splash, float, sink, and damping categories passed
  with `0` failed measurements.
- Coupled splash check: CPU reference crown `2.0805 m`, particle crown
  `1.9613 m`, agreement delta `0.1192 m` inside the accepted `0.2165 m` band.
- Broad-water evidence: shallow-water high-tier mass drift `1.307e-9`,
  momentum damping `0.5608`, no negative depths, no dry-cell leakage, and
  timestamp-query timing.
- Particle evidence: `4096` high-tier particles, spray mass fraction `0.2123`,
  momentum fraction `0.00773`, reentry energy `179.18 J`, and bounded readback.
- Gate: passed.

FG-14 is complete as of 2026-06-08. It moves particle splash accounting into
the actual packaged WebGPU renderer path. The renderer now derives
`localized-particle-splash-live-v1` feedback during object drops, exposes it in
runtime telemetry, uses particle crown/density/reentry in render uniforms, and
writes bounded particle foam/impulse feedback back into local grid rows.

Latest live particle evidence:

- Command: `npm run fluid:live-particles`.
- Report: `reports/fluid-live-particles-latest.json`.
- Gate: `G-FG-14`.
- Evidence snapshot: `docs/evidence/FG-14-live-particles-2026-06-08.json`.
- Runtime: packaged macOS app with renderer `webgpu-grid-primary-v1`, context
  `webgpu`, and high tier.
- Live coupling: `localized-particle-splash-live-v1`, active during the
  concrete-cube drop.
- Runtime telemetry: `468` live particles, particle crown `2.1219 m`, spray
  mass fraction `0.34`, momentum fraction `0.001146`, reentry energy
  `2.6228 J`, and `13` bounded grid feedback samples.
- Reference band: live particle crown stayed inside `0.8537 m` to `3.7053 m`.
- Renderer feedback: live particle render intensity `0.5982`; foam injection
  `0.0244`; no Canvas fallback and no per-frame full-grid readback.
- Gate: passed.

FG-15 is complete as of 2026-06-08. It reintroduces broad-water
pressure-gradient acceleration after the FG-11 conservative baseline. This is
not a silent replacement: `bounded-pressure-gradient-v1` remains an explicit
solver mode with nonzero pressure gain, slope limiting, momentum limiting, and
separate energy/momentum/wet-dry diagnostics.

Latest pressure-gradient evidence:

- Command: `npm run fluid:pressure`.
- Solver: `bounded-pressure-gradient-v1`.
- Report: `reports/fluid-pressure-gradient-latest.json`.
- Gate: `G-FG-15`.
- Evidence snapshot:
  `docs/evidence/FG-15-pressure-gradient-2026-06-08.json`.
- Standard tier: `256 x 144`, pressure gain `0.060`, mass drift `4.457e-8`,
  pressure energy drift `0.0033`, pressure momentum budget ratio `0.1887`,
  slope-limited cells `1642`, pressure work estimate `9347.76 J`, and
  timestamp-query GPU average `0.0195 ms/step`.
- High tier: `512 x 288`, pressure gain `0.060`, mass drift `3.912e-9`,
  pressure energy drift `0.0009`, pressure momentum budget ratio `0.0766`,
  slope-limited cells `4671`, pressure work estimate `13993.83 J`, and
  timestamp-query GPU average `0.0324 ms/step`.
- Stability: no negative depths, no dry-cell water or momentum leakage, bounded
  CFL, bounded end-of-run diagnostics only, and no per-frame full-grid
  readback.
- Gate: passed.

FG-16 is complete as of 2026-06-08. It moves the pressure-gradient broad-water
path into the actual packaged WebGPU renderer. The live renderer now allocates
height plus x/y momentum ping-pong state, runs `fluidWaterPressureStepShader`
with pressure gain, slope limiting, momentum limiting, depth/obstacle
boundaries, impulse coupling, and foam, then exposes bounded pressure telemetry
through canvas dataset fields and `window.__fluidWaterRenderStats`.

Latest live pressure evidence:

- Command: `npm run fluid:live-pressure`.
- Runtime: packaged macOS app.
- Solver: `bounded-pressure-gradient-live-v1`.
- Gate: `G-FG-16`.
- Evidence snapshot:
  `docs/evidence/FG-16-live-pressure-2026-06-08.json`.
- Renderer: `webgpu-grid-primary-v1`, context `webgpu`, high tier,
  `512 x 288`, `180` observed frames.
- Pressure telemetry: pressure gain `0.060`, slope limit `0.340`, momentum
  limit `1.15`, CFL `0.565685`, estimated pressure-state storage
  `5,898,240` bytes, pressure work telemetry `595.42 J`, and live impulse
  energy telemetry `10532.31 J`.
- State buffers: height, height scratch, x/y momentum ping-pong buffers, foam,
  obstacle, depth, and impulse.
- Coupled live path: the same concrete-cube packaged drop also reported
  `localized-particle-splash-live-v1` with `436` live droplets.
- Readback: pressure telemetry is bounded/no-full-grid-readback and the app
  stayed off Canvas 2D.
- Gate: passed.

FG-17 is complete as of 2026-06-08. It closes the next runtime loop: live
pressure no longer stops at renderer telemetry. The app now derives bounded
vertical and horizontal pressure force deltas from the live pressure summary,
combines them with object-grid force feedback, exposes
`window.__fluidGridCouplingForces`, and feeds that combined force packet into
the next fixed `stepSimulation` call.

Latest pressure force-feedback evidence:

- Command: `npm run fluid:live-pressure-feedback`.
- Runtime: packaged macOS app.
- Gate: `G-FG-17`.
- Evidence snapshot:
  `docs/evidence/FG-17-pressure-feedback-2026-06-08.json`.
- Pressure solver: `bounded-pressure-gradient-live-v1`, renderer
  `webgpu-grid-primary-v1`, context `webgpu`, high tier.
- Pressure force telemetry: vertical pressure force `107.78 N`, horizontal
  pressure force `0.0047 N`, force bound `1581.25 N`, and pressure grid
  velocity `0.1818 m/s`.
- Consumed rigid-body coupling: combined vertical force `2520.91 N`, combined
  horizontal force `0.1743 N`, pressure vertical contribution `107.78 N`, and
  pressure horizontal contribution `0.0047 N`.
- Coupled live path: object-grid coupling remained active, live particles
  remained active with `468` droplets, and no Canvas fallback or per-frame
  full-grid readback was used.
- Gate: passed.

FG-18 is complete as of 2026-06-08. It turns the live packaged app into the
reference-outcome evidence source instead of relying only on composite CPU and
solver packets. `OceanPhysicsApp` now exposes `window.__oceanPhysicsSnapshot`
for compact live physics state and `window.__oceanPhysicsScenarioControls` for
precise automated reference-case setup. The gate drives the packaged app
through concrete, ice, foam, and leaky-drum scenarios, then compares live
outcomes against drop, splash, float, sink, and damping bands.

Latest live reference-outcome evidence:

- Command: `npm run fluid:live-reference-outcomes`.
- Runtime: packaged macOS app.
- Gate: `G-FG-18`.
- Evidence snapshot:
  `docs/evidence/FG-18-live-reference-outcomes-2026-06-08.json`.
- Coverage: `5` live packaged cases, `10` comparisons, and all reference
  categories: drop, splash, float, sink, and damping.
- Concrete `8 m` drop: live impact speed `12.299 m/s` inside the
  `11.023..12.526 m/s` free-fall band; live splash crown `2.124 m` inside the
  `0.824..3.579 m` reference band.
- Ice float: reference hydrostatic fraction `0.8946` inside the
  `0.8596..0.9296` band, with live draft error `0.0422 m` under the `0.055 m`
  acceptance cap while the object was floating.
- Foam damping: live draft error `0.0084 m` and buoyancy error `0.0350` passed
  the damping bands. The app had not yet reported a formal `settledAtS`
  timestamp, so this gate claims live damping equilibrium, not a settled-time
  stamp.
- Sink behavior: concrete terminal-speed diagnostic `3.373 m/s` stayed inside
  the `1..8 m/s` band while the object was sinking; large/small leaky-drum
  sink-time prediction ratio was `0.2233`, under the `0.55` sensitivity cap.
- Telemetry discipline: WebGPU renderer `webgpu-grid-primary-v1`, context
  `webgpu`, bounded pressure feedback, live particle feedback, object-grid
  coupling during the concrete drop, `120 Hz` fixed-step loop, and no per-frame
  full-grid readback.
- Gate: passed.

FG-19 is complete as of 2026-06-08. It exists because smoothness has to be
proven in the packaged app with the same live pressure, particle, coupling, and
physics readouts that the reference gates use. A profiler showed that the foam
damping case was not GPU-bound: physics stepping was near `1 ms`, while live
float prediction and equilibrium diagnostics were blocking the main thread.
The app now publishes fast per-frame motion snapshots and keeps full
prediction/equilibrium diagnostics available through explicit scenario-control
snapshots, so display pacing no longer competes with heavy reference math.

Latest packaged display-pacing evidence:

- Command: `npm run fluid:display-pacing`.
- Runtime: packaged macOS app.
- Gate: `G-FG-19`.
- Evidence snapshot:
  `docs/evidence/FG-19-display-pacing-2026-06-08.json`.
- Coverage: idle display pacing, concrete impact display pacing, and foam
  damping display pacing at `1x` time scale.
- Smoothness: worst p95 frame time `9.2 ms`, worst p99 frame time `9.3 ms`,
  worst dropped-frame ratio `0.13%`, zero long-task duration, zero dropped
  simulation debt, and active physics time ratios near real time for concrete
  and foam.
- Telemetry discipline: WebGPU renderer `webgpu-grid-primary-v1`, context
  `webgpu`, pressure telemetry active, particles active in impact/damping
  scenarios, object-grid coupling active in active physics scenarios, and no
  Canvas fallback.
- Gate: passed.

FG-20 is complete as of 2026-06-08. It turns the resolution ladder from a
static design target into measured local GPU evidence. The packaged app now
runs standard, high, and ultra tiers through three solver families: broad grid
stepping, bounded pressure-gradient shallow water, and localized particle
splash. This is the first gate that directly proves the current machine has
headroom for higher-resolution fluid grids instead of only proving the selected
`high` renderer tier.

Latest resolution-scaling evidence:

- Command: `npm run fluid:resolution-scale`.
- Runtime: packaged macOS app.
- Gate: `G-FG-20`.
- Evidence snapshot:
  `docs/evidence/FG-20-resolution-scaling-2026-06-08.json`.
- Coverage: `standard` (`256 x 144`), `high` (`512 x 288`), and `ultra`
  (`768 x 432`) tiers across grid stepping, pressure shallow-water, and
  particle splash.
- Ultra result: `331,776` cells, combined measured storage `17.97 MiB`, grid
  GPU p95 `0.0903 ms`, pressure GPU p95 `0.0733 ms`, and particle GPU p95
  `0.0288 ms`.
- Scaling: ultra/high p95 ratios were `2.07x` for grid stepping, `1.03x` for
  pressure shallow water, and `1.92x` for particle splash, all below the `5x`
  gate cap.
- Telemetry discipline: timestamp-query timing was available, all solver
  families passed at every tier, and no full-grid readback path was used.
- Gate: passed.

FG-21 is complete as of 2026-06-08. It turns the ultra tier from benchmark-only
evidence into a live packaged renderer path. The Electron shell accepts
`OCEAN_LAB_FLUID_TIER=ultra`, passes it to the renderer as `?fluidTier=ultra`,
and the app routes that request through the same WebGPU capability limits that
protect fallback behavior. This keeps ultra opt-in and measurable rather than
silently making it the default on unsupported hardware.

Latest ultra renderer evidence:

- Command: `npm run fluid:ultra-renderer`.
- Runtime: packaged macOS app with `OCEAN_LAB_FLUID_TIER=ultra`.
- Gate: `G-FG-21`.
- Evidence snapshot:
  `docs/evidence/FG-21-ultra-renderer-2026-06-08.json`.
- Selected live tier: `ultra`, grid `768 x 432`, renderer
  `webgpu-grid-primary-v1`, context `webgpu`.
- Display pacing: idle ultra p95 `8.9 ms`, p99 `9.2 ms`; concrete-impact ultra
  p95 `9.3 ms`, p99 `9.4 ms`; zero dropped-frame ratio and zero dropped
  simulation debt in both scenarios.
- Live physics telemetry: pressure active, particles active during impact,
  object-grid coupling active during impact, fixed-step physics advancing near
  real time, and no Canvas fallback.
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
8. Local performance calibration: measure the real desktop app on the local GPU
   before accepting any near-realism claim.
9. Frame-loop hardening: keep physics on a bounded fixed-step accumulator so
   render cadence, UI updates, and future grid resolution changes cannot create
   variable-timestep artifacts.
10. Solver architecture gate: use primary-source evidence to keep the production
    path on hybrid GPU heightfield/free-surface water plus local particles,
    rejecting demo-only or hardware-impractical paths before implementation
    cost grows.
11. Reference dataset ingestion: require drop, splash, float, sink, and damping
    cases with source metadata, units, uncertainty, replayable measurement
    methods, and committed CPU-reference actuals before deeper solver changes.
12. Conservative shallow-water stepping: move broad water state to WebGPU
    height and x/y momentum buffers with mass-drift, momentum-damping, wet/dry,
    CFL, and timestamp-query timing diagnostics.
13. Localized particle splash stepping: spawn bounded particles from energetic
    impact events, step them in WebGPU, and feed mass, momentum, foam, and
    secondary reentry summaries back into the grid contract.
14. Coupled packaged-app calibration: package and launch the desktop app, then
    verify reference replay, broad-water mass/momentum evidence, local particle
    splash evidence, frame pacing, and bounded readback in one report.
15. Live particle renderer feedback: drive packaged WebGPU splash uniforms and
    local grid foam/impulse rows from calibrated particle mass, momentum, crown,
    density, and reentry summaries during real drops.
16. Bounded pressure-gradient acceleration: reintroduce broad-water pressure
    forces with slope and momentum limiters, then verify mass, wet/dry, energy,
    momentum-budget, CFL, and local GPU timing evidence before making stronger
    wave-realism claims.
17. Live pressure-gradient renderer path: run the packaged renderer's broad
    water through pressure-gradient height plus x/y momentum buffers and expose
    pressure work, impulse energy, CFL, slope limit, momentum limit, storage,
    and live particle coexistence without full-grid readback.
18. Pressure-informed rigid-body feedback: derive bounded pressure force deltas
    from the live pressure summary, combine them with object-grid coupling, and
    prove the fixed-step physics loop consumes the combined force packet in the
    packaged app.
19. Live reference-outcome replay: expose compact live physics snapshots, drive
    packaged reference scenarios, and verify observed drop, splash, float, sink,
    and damping outcomes while pressure, particles, object-grid coupling, and
    frame-loop telemetry remain bounded.
20. Packaged display pacing: keep full prediction/equilibrium diagnostics off
    the per-frame display path, then verify idle, dense impact, and foam damping
    scenarios sustain smooth WebGPU frame pacing with no long-task stalls or
    dropped simulation debt.
21. Resolution scaling: benchmark standard, high, and ultra tiers in the
    packaged app across grid stepping, pressure shallow water, and particle
    splash, then use timestamp-query timing, memory growth, and ultra/high
    ratios to guide future high-resolution grid choices.
22. Opt-in ultra renderer: pass an explicit ultra-tier request through the
    packaged app's runtime, keep fallback limits intact, and prove the live
    `768 x 432` renderer sustains smooth display pacing with pressure,
    particles, and object-grid coupling active.

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
