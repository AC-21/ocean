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

FG-22 is complete as of 2026-06-08. It proves the ultra renderer is not merely
a fast display mode; it can carry the live reference-outcome checks for drop,
splash, float, sink, and damping. The packaged app launches with
`OCEAN_LAB_FLUID_TIER=ultra`, selects the live `768 x 432` WebGPU grid, and
then replays the concrete, ice, foam, concrete-sink, and leaky-drum scenarios
used by the coupled reference gate.

Latest ultra-tier live reference evidence:

- Command: `npm run fluid:ultra-reference-outcomes`.
- Runtime: packaged macOS app with `OCEAN_LAB_FLUID_TIER=ultra`.
- Gate: `G-FG-22`.
- Evidence snapshot:
  `docs/evidence/FG-22-ultra-reference-outcomes-2026-06-08.json`.
- Selected live tier: `ultra`, grid `768 x 432`, renderer
  `webgpu-grid-primary-v1`, context `webgpu`.
- Reference coverage: drop speed, splash height, ice equilibrium submerged
  fraction, ice hydrostatic draft error, foam settled draft error, foam
  buoyancy error, foam equilibrium window, concrete terminal sink speed,
  concrete sink phase, and leaky-drum sink-time ratio.
- Measured outcomes: concrete drop speed `12.2987 m/s`, splash height
  `2.1240 m`, ice draft error `0.0064 m`, foam buoyancy error `0.0400`,
  concrete terminal sink speed `3.3725 m/s`, and leaky-drum sink-time ratio
  `0.2233`.
- Telemetry discipline: pressure, particles, and object-grid coupling active
  during concrete impact; fixed-step frame-loop evidence captured for active
  cases; no full-grid readback; no Canvas fallback.
- Gate: passed.

FG-23 is complete as of 2026-06-08. It turns the prior local GPU evidence into
an adaptive tier selector. Explicit user or environment tier overrides still
win, but `fluidTier=auto` can now consume a calibrated recommendation and route
the packaged app to the measured local tier. On this machine, the composed
FG-20, FG-21, and FG-22 evidence recommends `ultra`.

Latest adaptive-tier evidence:

- Command: `npm run fluid:adaptive-tier`.
- Runtime: packaged macOS app launched with `OCEAN_LAB_FLUID_TIER=auto` and
  `OCEAN_LAB_CALIBRATED_FLUID_TIER=ultra`.
- Gate: `G-FG-23`.
- Evidence snapshot:
  `docs/evidence/FG-23-adaptive-tier-2026-06-08.json`.
- Recommendation: `ultra`, because local resolution scaling, ultra renderer
  pacing, and ultra reference outcomes all passed.
- Headroom: max ultra GPU p95 step `0.0903 ms`, max ultra/high p95 ratio
  `2.0688`, max live p95 frame `9.3000 ms`, max live p99 frame `9.4000 ms`,
  and max measured storage `18,841,600` bytes.
- Runtime probe: selection mode `calibrated-auto`, requested tier `auto`,
  selected tier `ultra`, grid `768 x 432`, renderer `webgpu-grid-primary-v1`,
  context `webgpu`, and no Canvas fallback.
- Gate: passed.

FG-24 is complete as of 2026-06-08. It persists the adaptive calibration result
as app-owned local state. The packaged app now allowlists
`fluid-calibration.v1.json`, reads a passing
`ocean-fluid-calibration-profile-v1` profile during Electron startup, and
supplies `fluidTier=auto` plus the saved `calibratedFluidTier` before the
renderer loads. Explicit environment tier overrides still take precedence.

Latest persisted-calibration evidence:

- Command: `npm run fluid:persisted-calibration`.
- Runtime: packaged macOS app launched with no
  `OCEAN_LAB_CALIBRATED_FLUID_TIER`.
- Gate: `G-FG-24`.
- Evidence snapshot:
  `docs/evidence/FG-24-persisted-calibration-2026-06-08.json`.
- Profile: schema `ocean-fluid-calibration-profile-v1`, source gate
  `G-FG-23`, selected tier `ultra`, pass `true`, stored as
  `fluid-calibration.v1.json`.
- Runtime probe: main process read the profile, selection mode
  `calibrated-auto`, requested tier `auto`, selected tier `ultra`, grid
  `768 x 432`, renderer `webgpu-grid-primary-v1`, context `webgpu`, and no
  Canvas fallback.
- Gate: passed.

FG-25 is complete as of 2026-06-08. It turns the persisted calibration read path
into an installed local calibration workflow. The installer writes a passing
FG-23-derived `ocean-fluid-calibration-profile-v1` profile through the desktop
storage helper, verifies the profile round-trips from app-owned
`harborline-game` storage, then launches the packaged app twice from the same
user data directory with no fluid-tier environment variables.

Latest installed-calibration evidence:

- Command: `npm run fluid:installed-calibration`.
- Runtime: packaged macOS app launched twice with no `OCEAN_LAB_FLUID_TIER` and
  no `OCEAN_LAB_CALIBRATED_FLUID_TIER`.
- Gate: `G-FG-25`.
- Evidence snapshot:
  `docs/evidence/FG-25-installed-calibration-2026-06-08.json`.
- Install receipt: file `fluid-calibration.v1.json`, source gate `G-FG-23`,
  installed tier `ultra`, nonempty persisted profile, and storage round-trip
  match from the app-owned desktop storage directory.
- Runtime and relaunch probes: selection mode `calibrated-auto`, requested tier
  `auto`, selected tier `ultra`, grid `768 x 432`, renderer
  `webgpu-grid-primary-v1`, context `webgpu`, and no Canvas fallback.
- Gate: passed.

FG-26 is complete as of 2026-06-08. It answers the remaining local smoothness
question on the normal startup path. Earlier display-pacing gates used high or
explicit ultra paths; FG-26 installs the calibration profile, launches the
packaged app with no fluid-tier environment variables, verifies
`calibrated-auto -> ultra`, then samples idle, concrete-impact, and
foam-damping display pacing while every frame sample records installed-profile
selection provenance.

Latest installed-display-pacing evidence:

- Command: `npm run fluid:installed-display-pacing`.
- Runtime: packaged macOS app with installed `fluid-calibration.v1.json`, no
  `OCEAN_LAB_FLUID_TIER`, and no `OCEAN_LAB_CALIBRATED_FLUID_TIER`.
- Gate: `G-FG-26`.
- Evidence snapshot:
  `docs/evidence/FG-26-installed-display-pacing-2026-06-08.json`.
- Startup proof: installed profile source gate `G-FG-23`, selected tier
  `ultra`, storage round-trip verified, runtime mode `calibrated-auto`,
  requested tier `auto`, selected grid `768 x 432`, and renderer
  `webgpu-grid-primary-v1`.
- Display proof: idle, concrete-impact, and foam-damping scenarios all carry
  calibrated-auto ultra samples with WebGPU pressure, particles, object-grid
  coupling where expected, fixed-step debt, long-task telemetry, and smooth
  p95/p99 frame pacing.
- Gate: passed.

FG-27 is complete as of 2026-06-08. It closes a trust gap in the local
calibration path. A copied or stale `fluid-calibration.v1.json` should not be
able to silently select the high-resolution calibrated tier. Profiles now carry
the packaged app version plus FG-23 source-evidence provenance, and Electron
rejects missing, failed, malformed, or wrong-app-version profiles before
passing `calibratedFluidTier` into the renderer.

Latest calibration-freshness evidence:

- Command: `npm run fluid:calibration-freshness`.
- Runtime: packaged macOS app with no `OCEAN_LAB_FLUID_TIER` and no
  `OCEAN_LAB_CALIBRATED_FLUID_TIER`.
- Gate: `G-FG-27`.
- Evidence snapshot:
  `docs/evidence/FG-27-calibration-freshness-2026-06-08.json`.
- Current profile proof: `appVersion` matches the packaged app, source gate is
  `G-FG-23`, validation failures are empty, runtime mode is `calibrated-auto`,
  and selected tier/grid are `ultra` at `768 x 432`.
- Stale profile proof: app-version validation fails, Electron does not pass a
  calibrated tier, runtime mode is `default-high`, and selected tier/grid fall
  back to `high` at `512 x 288`.
- Gate: passed.

FG-28 is complete as of 2026-06-08. It closes the next trust gap in local GPU
calibration: a profile can be current for the app version but still be copied
from another GPU capability envelope. Profiles now bind to FG-01 WebGPU
capability provenance: adapter info, feature list, device limits, backend,
status, and a deterministic capability fingerprint. Electron rejects tampered
fingerprints before passing `calibratedFluidTier`; the renderer compares the
saved `calibratedFluidFingerprint` with the live `navigator.gpu` capability
fingerprint and downgrades copied-profile hardware mismatches to high.

Latest calibration-provenance evidence:

- Command: `npm run fluid:calibration-provenance`.
- Runtime: packaged macOS app with no `OCEAN_LAB_FLUID_TIER` and no
  `OCEAN_LAB_CALIBRATED_FLUID_TIER`.
- Gate: `G-FG-28`.
- Evidence snapshot:
  `docs/evidence/FG-28-calibration-provenance-2026-06-08.json`.
- Matching profile proof: FG-01 capability fingerprint matches the live WebGPU
  envelope, runtime mode is `calibrated-auto`, and selected tier/grid are
  `ultra` at `768 x 432`.
- Copied-profile proof: the profile remains internally valid but carries a
  different hardware fingerprint, so runtime mode becomes
  `calibration-provenance-fallback-high` and tier/grid fall back to `high` at
  `512 x 288`.
- tampered-profile proof: capability fingerprint validation fails in Electron,
  no calibrated tier reaches the renderer, runtime mode is `default-high`, and
  selected tier/grid are `high` at `512 x 288`.
- Gate: passed.

FG-29 is complete as of 2026-06-08. It raises the local smoothness bar from
isolated scenario samples to one sustained calibrated interaction workload.
The packaged app installs the hardware-provenance-valid calibration profile,
launches with no fluid-tier environment variables, then drives concrete, foam,
leaky-drum, and steel-sphere drops across one longer sample window while the
runtime remains `calibrated-auto -> ultra`.

Latest sustained-interaction-pacing evidence:

- Command: `npm run fluid:sustained-interaction-pacing`.
- Runtime: packaged macOS app with installed `fluid-calibration.v1.json`, no
  `OCEAN_LAB_FLUID_TIER`, and no `OCEAN_LAB_CALIBRATED_FLUID_TIER`.
- Gate: `G-FG-29`.
- Evidence snapshot:
  `docs/evidence/FG-29-sustained-interaction-pacing-2026-06-08.json`.
- Workload proof: four scripted drops cover dense concrete impact, foam
  damping, leaky-drum float/fill behavior, and compact steel-sphere sinking in
  one sustained run.
- Runtime proof: every representative sample stays on calibrated-auto ultra,
  the `768 x 432` WebGPU grid, and `webgpu-grid-primary-v1`.
- Smoothness proof: active pressure, particles, and object-grid coupling are
  observed while frame pacing, long-task duration, water-frame progression, and
  fixed-step simulation debt remain inside thresholds.
- Gate: passed.

FG-30 is complete as of 2026-06-08. It closes a reproducibility gap exposed by
the packaged evidence gates: Electron Packager can try to fetch remote
checksum metadata even when the matching Electron zip already exists locally.
`scripts/package_mac.mjs` now discovers the exact local cached Electron zip for
the current version/platform/arch and passes `electron-zip-dir` to Packager.
The package reproducibility gate rebuilds the app through that cached path in a
neutral `/private/tmp/ocean-lab-package-reproducibility-release` staging root,
then runs the sustained calibrated interaction report against the freshly
packaged app. The temp staging root avoids File Provider metadata from the
workspace's Documents folder invalidating macOS launch evidence.

Latest package-reproducibility evidence:

- Command: `npm run fluid:package-reproducibility`.
- Runtime: local macOS packaging using cached
  `electron-v42.3.3-darwin-arm64.zip`.
- Gate: `G-FG-30`.
- Evidence snapshot:
  `docs/evidence/FG-30-package-reproducibility-2026-06-08.json`.
- Cache proof: Electron zip cache hit is true, with `electron-zip-dir` pointing
  at the local `~/Library/Caches/electron/...` artifact.
- Package proof:
  `/private/tmp/ocean-lab-package-reproducibility-release/Ocean Impact Lab-darwin-arm64/Ocean Impact Lab.app`
  is rebuilt by `scripts/package_mac.mjs`.
- Runtime proof: the freshly packaged app passes sustained calibrated-auto
  ultra interaction pacing on the `768 x 432` WebGPU grid.
- Execution proof: because this gate launches a real macOS GUI app through
  Playwright, it must run in the host execution context rather than the Codex
  filesystem sandbox.
- Gate: passed.

FG-31 is complete as of 2026-06-08. It adds an impact energy-budget check on
top of the ultra live reference evidence. The goal is not to claim perfect CFD;
it is to stop accepting visually exciting splashes whose energy channels are
unbounded or source-less. The gate consumes the FG-22 live concrete impact and
accounts for pressure impulse energy, splash grid energy, foam energy, splash
potential energy, particle reentry energy, ejected/displaced mass, and
reentered/spray mass while requiring the source trace to include the reference
gravity, calibration, and solver-architecture evidence.

Latest impact-energy-budget evidence:

- Command: `npm run fluid:impact-energy-budget`.
- Input evidence:
  `docs/evidence/FG-22-ultra-reference-outcomes-2026-06-08.json` and
  `data/fluid-reference-cases.json`.
- Gate: `G-FG-31`.
- Evidence snapshot:
  `docs/evidence/FG-31-impact-energy-budget-2026-06-08.json`.
- Energy proof: the live concrete impact records 67.75 kJ of kinetic impact
  energy, 32.6% accounted water energy, 15.86% pressure impulse energy, 12.48%
  splash-grid energy, 4.21% splash potential energy, and 0.09% particle reentry
  energy, all within the configured thresholds.
- Telemetry proof: ultra `768 x 432` WebGPU renderer telemetry stays active for
  pressure, particle splash, grid splash, object-grid coupling, and
  no-full-grid-readback discipline.
- Source proof: source trace includes `nist-standard-gravity`,
  `fg06-calibration-evidence`, and `fg09-solver-architecture`.
- Gate: passed.

FG-32 is complete as of 2026-06-08. It closes the surface-recovery caveat in
the migration strategy with a packaged ultra run rather than a still-frame
claim. A shallower tank let the concrete cube reach bottom too early, so the
gate uses a 22 m calm-water tank, drops the concrete cube from 8 m, and samples
five WebGPU canvas screenshots across the post-impact recovery window. The
surface must start visibly agitated and then recover in both visual metrics and
live physics telemetry while the renderer stays on the `768 x 432` WebGPU grid.

Latest surface-recovery evidence:

- Command: `npm run fluid:surface-recovery`.
- Runtime: packaged macOS app with `OCEAN_LAB_FLUID_TIER=ultra`.
- Gate: `G-FG-32`.
- Evidence snapshot:
  `docs/evidence/FG-32-surface-recovery-2026-06-08.json`.
- Scenario: `concrete-cube`, 8 m drop, 22 m calm-water depth.
- Visual recovery proof: luma stddev falls from `30.9536` to `19.2649`
  (`0.6224` ratio), color buckets fall from `57` to `23` (`0.4035` ratio),
  and late bright foam fraction is `0`.
- Physics recovery proof: pressure work ratio falls to `0.0780`, foam-energy
  ratio falls to `0.6724`, and water frames advance by `449` over the sample
  window.
- Telemetry discipline: packaged ultra renderer `webgpu-grid-primary-v1`,
  context `webgpu`, grid `768 x 432`, active pressure, particles, splash,
  object-grid coupling, zero dropped fixed-step debt, and
  no-full-grid-readback telemetry across all samples.
- Gate: passed.

FG-33 is complete as of 2026-06-08. It turns the user-facing Desktop button
into a reproducible release gate. The prior black-screen investigation showed
that a renderer can be healthy while a workspace-local app bundle is stale or
fragile because of macOS signing metadata. FG-33 packages the app into a stable
local install root outside the repo workspace, verifies the Desktop launcher
points at that signed app bundle, then launches the exact Desktop target with
the default user profile and runs the nonblank/varied WebGPU pixel probe.

Latest desktop-launcher evidence:

- Command: `npm run fluid:desktop-launcher`.
- Gate: `G-FG-33`.
- Evidence snapshot:
  `docs/evidence/FG-33-desktop-launcher-2026-06-08.json`.
- Install root:
  `/Users/sasha/Applications/Ocean Impact Lab Builds`, outside
  `/Users/sasha/Documents/New project`.
- Desktop launcher:
  `/Users/sasha/Desktop/Ocean Impact Lab.app`, a symlink resolving to the
  installed app bundle.
- Signing proof: `codesign --verify --deep --strict --verbose=4` passes, and
  signing-relevant forbidden xattrs are empty.
- Render proof: the exact Desktop launcher executable runs with default user
  data, renderer `webgpu-grid-primary-v1`, context `webgpu`, `56` water frames,
  nonblank/varied pixels, average luma `125.6693`, and `23` color buckets.
- Gate: passed.

FG-34 is complete as of 2026-06-08. FG-33 proved the Desktop button renders,
but it still started from the real default profile at the conservative high
tier because no calibration profile was installed in the normal Application
Support folder. FG-34 installs the FG-23-derived, hardware-provenance-valid
calibration profile into the real Ocean Impact Lab default profile, then
launches the exact Desktop app with no fluid-tier environment overrides and
proves Electron reads the profile before the renderer starts.

Latest default-profile calibration evidence:

- Command: `npm run fluid:default-profile-calibration`.
- Gate: `G-FG-34`.
- Evidence snapshot:
  `docs/evidence/FG-34-default-profile-calibration-2026-06-08.json`.
- Profile path:
  `/Users/sasha/Library/Application Support/Ocean Impact Lab/harborline-game/fluid-calibration.v1.json`.
- Profile proof: schema `ocean-fluid-calibration-profile-v1`, app version
  `0.1.0`, source gate `G-FG-23`, capability source gate `G-FG-01`, adapter
  `apple / metal-3`, selected tier `ultra`, persisted bytes `2376`, and
  storage round-trip verified.
- Runtime proof: `/Users/sasha/Desktop/Ocean Impact Lab.app` launches without
  `OCEAN_LAB_FLUID_TIER`, `OCEAN_LAB_CALIBRATED_FLUID_TIER`, or
  `HARBORLINE_USER_DATA_DIR`; selection mode is `calibrated-auto`, requested
  tier is `auto`, selected tier is `ultra`, and the live canvas grid is
  `768 x 432`.
- Render proof: renderer `webgpu-grid-primary-v1`, context `webgpu`, `81`
  water frames, nonblank/varied pixels, average luma `125.7752`, and `23`
  color buckets.
- Gate: passed.

FG-35 is complete as of 2026-06-08. The black-screen follow-up exposed a
different failure class from FG-34: an Electron renderer can be alive and
pixel-probeable while the normal macOS Desktop/Finder launch path leaves the
user without a visible ocean window. FG-35 turns the visible-window behavior
into a release gate. It rebuilds and calibrates the Desktop app through FG-34,
then opens `/Users/sasha/Desktop/Ocean Impact Lab.app` with macOS `open`,
foregrounds the installed app, captures the actual screen, crops the ocean
viewport region from the visible window, and rejects blank or flat pixels.

Latest desktop-visibility evidence:

- Command: `npm run fluid:desktop-visibility`.
- Gate: `G-FG-35`.
- Evidence snapshot:
  `docs/evidence/FG-35-desktop-visibility-2026-06-08.json`.
- Normal launch proof: process comes from
  `/Users/sasha/Applications/Ocean Impact Lab Builds/Ocean Impact Lab-darwin-arm64/Ocean Impact Lab.app`
  through the Desktop launcher, not the stale workspace-local `release` bundle.
- Calibration prerequisite: input evidence is `G-FG-34`, passing
  `calibrated-auto` ultra, renderer `webgpu-grid-primary-v1`, context `webgpu`,
  and grid `768 x 432`.
- Window proof: macOS exposes a visible frontmost `Ocean Impact Lab` window
  with on-screen geometry.
- Ocean viewport proof: a cropped screenshot of the visible water region is
  nonblank/varied with enough luma and color-bucket diversity to reject a
  black surface in the ocean pane.
- Gate: passed.

FG-36 is complete as of 2026-06-08. FG-22 proved the explicit ultra packaged
reference-outcome path, and FG-34/FG-35 proved the default Desktop app can
select calibrated-auto ultra and show a visible nonblack ocean. FG-36 ties
those threads together: the real installed Desktop app, launched through the
Desktop launcher with no `OCEAN_LAB_FLUID_TIER`,
`OCEAN_LAB_CALIBRATED_FLUID_TIER`, or `HARBORLINE_USER_DATA_DIR`, must still
pass the live drop, splash, float, sink, and damping reference comparisons.

Latest installed-reference evidence:

- Command: `npm run fluid:installed-reference-outcomes`.
- Gate: `G-FG-36`.
- Evidence snapshot:
  `docs/evidence/FG-36-installed-reference-outcomes-2026-06-08.json`.
- Launch proof: `/Users/sasha/Desktop/Ocean Impact Lab.app` resolves to the
  installed bundle under `/Users/sasha/Applications/Ocean Impact Lab Builds`,
  and the launch environment has no fluid-tier or user-data override.
- Runtime proof: selection mode `calibrated-auto`, requested tier `auto`,
  selected tier `ultra`, renderer `webgpu-grid-primary-v1`, context `webgpu`,
  and grid `768 x 432`.
- Reference proof: five installed-profile live cases cover concrete
  drop/splash, ice hydrostatic float, foam damping/settling, concrete sink
  terminal behavior, and leaky-drum sink-time sensitivity.
- Comparison proof: ten live comparisons pass for drop speed, splash height,
  float fraction/draft, damping draft/buoyancy/equilibrium, sink terminal
  speed/phase, and leak sensitivity.
- Telemetry proof: WebGPU pressure, localized particles, object-grid coupling,
  fixed-step frame-loop health, and no-full-grid-readback discipline remain
  active during the installed-profile run.
- Gate: passed.

FG-37 is complete as of 2026-06-08. FG-36 proved the installed Desktop app can
produce physically defensible reference outcomes, but outcome correctness alone
does not prove the user-facing simulator is smooth while those cases run.
FG-37 composes the passing FG-36 packet with a new installed-reference pacing
envelope: the real Desktop launcher starts without `OCEAN_LAB_FLUID_TIER`,
`OCEAN_LAB_CALIBRATED_FLUID_TIER`, or `HARBORLINE_USER_DATA_DIR`, selects
calibrated-auto ultra, then samples smooth calibrated-auto ultra display pacing
while exercising the same reference categories.

Latest installed-reference pacing evidence:

- Command: `npm run fluid:installed-reference-pacing`.
- Gate: `G-FG-37`.
- Evidence snapshot:
  `docs/evidence/FG-37-installed-reference-pacing-2026-06-08.json`.
- Composed reference proof: input evidence is `G-FG-36`, passing, with five
  installed reference cases, ten comparisons, categories `damping`, `drop`,
  `float`, `sink`, and `splash`, and grid `768 x 432`.
- Launch proof: `/Users/sasha/Desktop/Ocean Impact Lab.app` resolves to the
  installed bundle under `/Users/sasha/Applications/Ocean Impact Lab Builds`,
  and the pacing launch environment has no fluid-tier or user-data override.
- Runtime proof: selection mode `calibrated-auto`, requested tier `auto`,
  selected tier `ultra`, renderer `webgpu-grid-primary-v1`, context `webgpu`,
  and grid `768 x 432`.
- Pacing proof: five installed-reference pacing scenarios cover concrete drop/splash, ice float, foam damping, concrete sink, and leaky-drum sink.
  Each scenario must pass the installed reference smoothness envelope for p95,
  p99, dropped-frame ratio, duplicate water-frame ratio, water-frame
  advancement, fixed-step debt, and long-task duration.
- Measured pacing: worst p95 `9.20 ms`, worst p99 `9.40 ms`, worst
  dropped-frame ratio `0`, worst duplicate water-frame ratio `0.00219`, and
  zero fixed-step dropped debt across the five scenarios.
- Telemetry proof: active pressure, object-grid coupling, particle telemetry
  where expected, and no-full-grid-readback flags remain present while those
  reference-category pacing windows are measured.
- Gate: passed.

FG-38 is complete as of 2026-06-08. FG-20 proved the existing production
resolution ladder through the calibrated ultra tier, but the next realism push
needs measured headroom beyond the live `768 x 432` grid before any production
runtime tier is raised. The production runtime remains capped at `768 x 432`
while FG-38 runs benchmark-only explicit high-resolution probes at `1024 x 576`
and `1280 x 720` through the packaged Desktop app.

Latest high-resolution headroom evidence:

- Command: `npm run fluid:high-resolution-headroom`.
- Gate: `G-FG-38`.
- Evidence snapshot:
  `docs/evidence/FG-38-high-resolution-headroom-2026-06-08.json`.
- Runtime invariant: the packaged app launches with the live production runtime
  still capped at ultra, grid `768 x 432`, renderer `webgpu-grid-primary-v1`,
  and context `webgpu`.
- Benchmark scope: explicit `gridDimensions` are accepted only by benchmark
  planners in `fluidGridGpu`, `fluidShallowWater`, and
  `fluidParticleSplash`; the production `fluidGridTiers` ladder still stops at
  ultra.
- Candidate grids: `1024 x 576` and `1280 x 720`, both larger than production
  ultra and monotonic in cell count and storage.
- Measured headroom: `1024 x 576` ran at `1.78x` ultra cells with grid p95
  `0.0764 ms`, pressure p95 `0.2853 ms`, particle p95 `0.0333 ms`, and
  `31.75 MiB` combined benchmark storage.
- Largest probe: `1280 x 720` ran at `2.78x` ultra cells with grid p95
  `0.4052 ms`, pressure p95 `0.3492 ms`, particle p95 `0.0178 ms`, and
  `49.47 MiB` combined benchmark storage.
- Telemetry proof: WebGPU grid stepping, bounded-pressure-gradient shallow
  water, and localized particle-splash benchmarks all require
  `timestamp-query` timing, bounded wall timing, bounded GPU p95 timing, memory
  below local storage-buffer limits, and no full-grid readback.
- Gate: passed.

FG-39 moves one approved high-resolution candidate out of benchmark-only mode
and into the actual packaged renderer under an explicit experimental live grid
flag. The default calibrated capability selection remains capped at `768 x 432`
and tier `ultra`; only launches with `OCEAN_LAB_EXPERIMENTAL_FLUID_GRID=1024x576`
can allocate the live water renderer at `1024 x 576`.

Experimental live grid evidence:

- Command: `npm run fluid:experimental-live-grid`.
- Gate: `G-FG-39`.
- Evidence snapshot:
  `docs/evidence/FG-39-experimental-live-grid-2026-06-08.json`.
- Runtime invariant: capability selection remains `ultra` at `768 x 432`,
  renderer `webgpu-grid-primary-v1`, context `webgpu`, while the live canvas
  reports runtime grid `1024 x 576` only because the explicit experimental flag
  was provided.
- Pacing scope: idle water and an 8 m concrete-cube impact are sampled in the
  packaged app at 1x time scale, with p95/p99 frame pacing, duplicate water
  frames, fixed-step debt, and water-frame advancement checked through the
  existing display-pacing envelope.
- Measured live-grid pacing: idle ran at `120.2 FPS` with p95 `9.20 ms`, p99
  `9.40 ms`, zero dropped-frame ratio, and `337` water frames advanced;
  concrete impact ran at `120.1 FPS` with p95 `9.00 ms`, p99 `9.30 ms`, zero
  dropped-frame ratio, duplicate water-frame ratio `0.00151`, and `660` water
  frames advanced.
- Telemetry proof: active pressure, localized particles, and object-grid
  coupling must be observed where expected; pressure and particle telemetry must
  report no full-grid readback.
- Gate: passed.

FG-40 extends the experimental live grid from renderer/pacing proof into
reference-outcome proof for the experimental 1024 x 576 live WebGPU renderer.
The packaged app launches with
`OCEAN_LAB_EXPERIMENTAL_FLUID_GRID=1024x576`, keeps capability selection capped
at ultra `768 x 432`, and replays the same physical reference envelope used by
the ultra gate against the live `1024 x 576` WebGPU renderer.

Experimental reference outcome evidence:

- Command: `npm run fluid:experimental-reference-outcomes`.
- Gate: `G-FG-40`.
- Evidence snapshot:
  `docs/evidence/FG-40-experimental-reference-outcomes-2026-06-08.json`.
- Runtime invariant: capability selection stays `ultra` at `768 x 432`;
  runtime grid override and live canvas grid must both be `1024 x 576`.
- Reference scope: concrete drop/splash, ice float, foam damping, concrete
  sink, and leaky-drum sink cases must preserve the existing reference bands
  for impact speed, splash height, hydrostatic draft, equilibrium damping,
  terminal sink speed, sink phase, and leak-rate sink-time ratio.
- Measured reference outcomes: concrete impact speed `12.299 m/s`, splash
  height `2.124 m`, ice equilibrium submerged fraction `0.8946`, ice draft
  error `0.0021 m`, foam draft error `0.0144 m`, foam buoyancy error ratio
  `0.0675`, concrete terminal sink speed `3.373 m/s`, and leaky-drum sink-time
  ratio `0.2233` all stayed inside their accepted bands.
- Telemetry proof: WebGPU renderer/context, bounded-pressure live solver,
  localized particle splash, object-grid coupling, 120 Hz fixed-step frame-loop
  stats, and pressure plus particle no-full-grid-readback flags must remain
  active while the high-resolution renderer is attached.

FG-41 promotes the validated high-resolution renderer into persisted local
calibration. Instead of requiring a manual
`OCEAN_LAB_EXPERIMENTAL_FLUID_GRID=1024x576` launch, the app-owned calibration
profile can record an optional `runtimeGrid` sourced from passing FG-40
evidence. Electron then reads that profile at startup and forwards
`experimentalFluidGrid=1024x576` into the renderer query while the calibrated
tier/capability ladder still reports ultra at `768 x 432`.

Persisted high-resolution calibration evidence:

- Command: `npm run fluid:high-resolution-calibration`.
- Gate: `G-FG-41`.
- Evidence snapshot:
  `docs/evidence/FG-41-high-resolution-calibration-2026-06-08.json`.
- Source invariant: the profile runtime grid must come from passing `G-FG-40`
  evidence with live grid `1024 x 576`, five cases, and ten reference
  comparisons.
- Launch invariant: the packaged app is launched with no
  `OCEAN_LAB_FLUID_TIER`, `OCEAN_LAB_CALIBRATED_FLUID_TIER`, or
  `OCEAN_LAB_EXPERIMENTAL_FLUID_GRID` environment override.
- Runtime proof: selection mode is `calibrated-auto`, selected tier remains
  `ultra`, capability grid remains `768 x 432`, `window.__fluidRuntimeGridOverride`
  reports `1024 x 576`, and the live canvas reports `1024 x 576` with
  `webgpu-grid-primary-v1` / `webgpu`.
- Measured startup proof: the persisted profile was `2581` bytes, round-tripped
  through storage, was read by the main process, launched with
  `envExperimentalGridPresent: false`, and reached `12` live WebGPU water frames
  at `1024 x 576` before the gate accepted it.

FG-42 closes the loop from temporary high-resolution proof to the real installed
Desktop path. The gate writes the FG-40-derived runtime grid into the normal
default `fluid-calibration.v1.json`, launches `/Users/sasha/Desktop/Ocean Impact
Lab.app` without manual fluid-tier, high-resolution grid, or userData
environment overrides, replays the reference outcomes, and then samples pacing
while the live renderer stays at `1024 x 576`.

Installed high-resolution reference pacing evidence:

- Command: `npm run fluid:installed-high-resolution-reference-pacing`.
- Gate: `G-FG-42`.
- Evidence snapshot:
  `docs/evidence/FG-42-installed-high-resolution-reference-pacing-2026-06-08.json`.
- Profile proof: the default Desktop storage path
  `/Users/sasha/Library/Application Support/Ocean Impact Lab/harborline-game`
  contains `fluid-calibration.v1.json`, persisted `2581` bytes, records the
  FG-40 `runtimeGrid`, round-tripped through storage, and was read by the main
  process.
- Launch invariant: the installed app launched with no `OCEAN_LAB_FLUID_TIER`,
  `OCEAN_LAB_CALIBRATED_FLUID_TIER`, `OCEAN_LAB_EXPERIMENTAL_FLUID_GRID`, or
  `HARBORLINE_USER_DATA_DIR`.
- Runtime proof: selection mode remained `calibrated-auto`, selected tier
  remained `ultra`, capability grid remained `768 x 432`,
  `window.__fluidRuntimeGridOverride` reported `1024 x 576`, and the canvas
  reported `webgpu-grid-primary-v1` / `webgpu` at live `1024 x 576`.
- Reference proof: the installed high-resolution path replayed concrete
  drop/splash, ice float, foam damping, concrete sink, and leaky-drum sink with
  five cases and ten reference comparisons, while preserving active pressure,
  particles, object-grid coupling, fixed-step frame-loop telemetry, and pressure
  plus particle no-full-grid-readback flags.
- Pacing proof: five high-resolution reference scenarios sustained about
  `120 FPS`, max p95 frame time `9.20 ms`, max p99 frame time `9.30 ms`, zero
  dropped-frame ratio, worst duplicate-water-frame ratio `0.0022`, and live
  `1024 x 576` canvas/runtime-grid telemetry in every representative sample.
  This gives the installed app explicit 1024 x 576 canvas/runtime-grid telemetry
  rather than a temporary experimental flag proof.

FG-43 broadens the installed high-resolution path from reference cases to the
full object-preset envelope. The gate answers the user-facing question "how long
will this object float?" across foam, pine, ice, leaky drum, hardwood, concrete,
steel, and aluminum presets while also capturing the high-resolution WebGPU
canvas so a black ocean screen cannot pass on telemetry alone.

Installed high-resolution float/sink envelope evidence:

- Command: `npm run fluid:installed-high-resolution-float-sink`.
- Gate: `G-FG-43`.
- Evidence snapshot:
  `docs/evidence/FG-43-installed-high-resolution-float-sink-envelope-2026-06-08.json`.
- Visual proof: the live `1024 x 576` WebGPU canvas screenshot
  `reports/fluid-installed-high-resolution-float-sink-envelope-latest.png`
  measured `nonblank` / `varied`, average luma `124.27`, and `27` color buckets.
- Runtime proof: selection mode stayed `calibrated-auto`, selected tier stayed
  `ultra`, capability grid stayed `768 x 432`, `window.__fluidRuntimeGridOverride`
  reported `1024 x 576`, and the canvas reported `webgpu-grid-primary-v1` /
  `webgpu` at live `1024 x 576`.
- Outcome proof: the gate exercised all eight presets and covered
  `floats-indefinitely`, `sinks-immediately`, and `waterlogs-then-sinks`.
  Foam, pine, ice, and aluminum remained stable floaters; concrete and
  steel sank immediately; leaky drum and hardwood crate predicted finite
  waterlogging sink times.
- Waterlogging proof: the leaky drum base prediction was `11260.5 s`, hardwood
  crate was `3648.3 s`, and accelerated waterlogging drove each case across its
  sink threshold in the installed high-resolution app.
- Pacing proof: the full preset sweep held max p95 frame time `9.20 ms`, max p99
  frame time `9.40 ms`, worst dropped-frame ratio `0.0011`, and worst
  duplicate-water-frame ratio `0.0028` while preserving active pressure,
  particles, coupling, and no-full-grid-readback telemetry.

FG-44 closes the user-visible black-screen gap for the normal macOS Desktop
launch path. FG-43 proved that an automated renderer capture was nonblank at
`1024 x 576`, but FG-44 opens `/Users/sasha/Desktop/Ocean Impact Lab.app`
through macOS `open`, foregrounds the installed app, screenshots the actual
display, crops the ocean viewport, and rejects the run if the high-resolution
viewport looks blank, flat, hidden, off-screen, or sourced from the wrong bundle.

Installed high-resolution Desktop visibility evidence:

- Command: `npm run fluid:installed-high-resolution-desktop-visibility`.
- Gate: `G-FG-44`.
- Evidence snapshot:
  `docs/evidence/FG-44-installed-high-resolution-desktop-visibility-2026-06-08.json`.
- Source proof: the gate consumes fresh FG-43 evidence from
  `reports/fluid-installed-high-resolution-float-sink-envelope-latest.json`,
  requiring a passing `G-FG-43` report with live `1024 x 576`
  `webgpu-grid-primary-v1` / `webgpu` telemetry, default high-resolution
  storage, `runtimeGrid` persistence, main-process reads, and a nonblank varied
  source canvas.
- Desktop proof: the launcher at `/Users/sasha/Desktop/Ocean Impact Lab.app`
  must resolve to the installed bundle, the process command must come from the
  installed bundle, and the visible window must be frontmost, on-screen, titled
  `Ocean Impact Lab`, and at least `1000 x 700`. Latest proof resolved the
  launcher to
  `/Users/sasha/Applications/Ocean Impact Lab Builds/Ocean Impact Lab-darwin-arm64/Ocean Impact Lab.app`,
  found the installed bundle process, and captured one frontmost on-screen
  `1360 x 900` app window.
- Black-screen proof: the report captures
  `reports/fluid-installed-high-resolution-desktop-visibility-latest.png`,
  crops the user-visible ocean viewport, and requires nonblank varied pixels,
  average luma above the black-screen threshold, and enough color buckets to
  reject a flat or black high-resolution screen. Latest proof cropped a
  `612 x 468` viewport at screen position `578, 271` and measured
  `nonblank` / `varied` pixels, average luma `217.22`, and `25` color buckets.

FG-45 moves the high-resolution proof from renderer automation into the
operator-facing loop. The gate starts from fresh FG-44 visible-screen evidence,
launches the installed Desktop app without fluid-tier, grid, or userData
environment overrides, clicks the actual preset buttons and visible `Drop`
control, and then scrapes the UI readout panels instead of trusting only the
scenario API.

Installed high-resolution operator readout evidence:

- Command: `npm run fluid:installed-high-resolution-operator-readout`.
- Gate: `G-FG-45`.
- Evidence snapshot:
  `docs/evidence/FG-45-installed-high-resolution-operator-readout-2026-06-08.json`.
- Source proof: the gate consumes FG-44 visible Desktop evidence, requiring a
  passing `G-FG-44` report, a live `1024 x 576` source grid, visible/frontmost
  Desktop window proof, and nonblank varied viewport pixels before operator
  readouts can be trusted.
- Operator proof: the report clicks the visible `Closed-cell foam block`,
  `Concrete cube`, and `Leaky sealed steel drum` preset controls plus the
  visible `Drop` button, covering `floats-indefinitely`,
  `sinks-immediately`, and `waterlogs-then-sinks` outcome classes. Latest
  proof recorded foam as `Floating for 3.3 s` with predicted sink
  `Indefinite`, concrete as `Sinking now` with predicted sink `Immediate`, and
  leaky drum as `Floating for 3.0 s` with predicted sink `3.1 hr`.
- Readout proof: the visible `Float Result`, `Float Timing`, `Impact`,
  `Splash`, `Renderer`, and `Grid` readouts must agree with live physics
  snapshots while the renderer remains `webgpu-grid-primary-v1` / `webgpu` at
  live `1024 x 576`. Latest visible readouts recorded impact/splash pairs of
  `11.25 m/s` / `1.82 m`, `12.56 m/s` / `2.22 m`, and `12.38 m/s` / `2.14 m`.
- Pacing proof: each operator-driven scenario records display-pacing samples,
  active pressure, particle, and coupling telemetry, and pressure plus particle
  no-full-grid-readback flags so the UI can answer "what happened and how long
  will it float?" without hiding a choppy or CPU fallback path. Latest proof
  covered `3` scenarios, max p95 `9.70 ms`, max p99 `10.30 ms`, zero dropped
  frame ratio, zero duplicate-water-frame ratio, active pressure/particles/
  coupling, and pressure plus particle no-full-grid-readback flags.

FG-46 turns the accepted high-resolution reference outcomes into a residual
budget instead of a binary pass/fail. The gate consumes FG-42 installed
reference pacing plus FG-45 operator evidence, then computes a normalized
residual and nearest-bound margin for each structured FG-40 comparison. This
keeps the realism work honest: a value can still be inside the accepted band
and fail if it hugs the tolerance edge, and visible readout text cannot stand
in for physics snapshots, sample provenance, or no-full-grid-readback proof.

Installed high-resolution residual budget evidence:

- Command: `npm run fluid:installed-high-resolution-residual-budget`.
- Gate: `G-FG-46`.
- Evidence snapshot:
  `docs/evidence/FG-46-installed-high-resolution-residual-budget-2026-06-08.json`.
- Source proof: the gate requires passing `G-FG-42` and `G-FG-45` reports,
  live `1024 x 576` WebGPU runtime provenance, structured reference
  comparisons for drop, splash, float, sink, and damping, and pressure/particle
  no-readback telemetry.
- Residual proof: the report records all 10 structured comparison residuals,
  the closest continuous margin ratio, the worst normalized residual, exact
  boolean comparison count, and watch-list comparison ids for values that are
  still passing but close enough to deserve attention in the next physics pass.

FG-47 makes high-resolution black-frame detection a burst watchdog instead of a
single screenshot anecdote. The gate starts from passing FG-46 residual
evidence, installs the default high-resolution profile, launches the real
Desktop app, captures idle and post-drop `1024 x 576` WebGPU canvas frames, and
requires the water-frame counter plus pixel probes to move together.

Installed high-resolution visual watchdog evidence:

- Command: `npm run fluid:installed-high-resolution-visual-watchdog`.
- Gate: `G-FG-47`.
- Evidence snapshot:
  `docs/evidence/FG-47-installed-high-resolution-visual-watchdog-2026-06-08.json`.
- Source proof: the watchdog consumes `G-FG-46`, requiring 10 structured
  residual comparisons, live `1024 x 576` reference/operator provenance, and
  no-full-grid-readback flags before visual samples can count.
- Visual proof: the report captures multiple idle and post-drop canvas
  screenshots under the installed Desktop app, records average luma, color
  bucket variety, dimensions, water-frame ids, renderer/context/grid telemetry,
  and rejects black, flat, stale, fallback, or UI-only visual evidence.

FG-48 corrects the residual interpretation layer. FG-46 intentionally recorded
midpoint residuals and nearest-bound margins for every comparison, but that can
make a small error metric look suspicious because an error band such as
`0..0.055 m` has its physical target at zero, not at the midpoint. The target
residual gate keeps the accepted bands intact while adding objective semantics:
physical ranges target the midpoint, error metrics are lower-is-better, and
boolean phase/window checks are exact.

Installed high-resolution target residual evidence:

- Command: `npm run fluid:installed-high-resolution-target-residuals`.
- Gate: `G-FG-48`.
- Evidence snapshot:
  `docs/evidence/FG-48-installed-high-resolution-target-residuals-2026-06-08.json`.
- Source proof: the gate consumes passing `G-FG-46` residual evidence and
  passing `G-FG-47` visual watchdog evidence, requiring live `1024 x 576`
  WebGPU provenance, nonblank varied visual samples, advancing water frames,
  post-drop active physics, and no-full-grid-readback continuity.
- Target proof: all 10 comparisons are classified as `target-midpoint`,
  `lower-is-better`, or `exact`; the report records `targetErrorRatio` and
  `toleranceMarginRatio` separately, so small hydrostatic/draft/buoyancy errors
  are judged against zero while broad physical ranges retain midpoint targets.

FG-49 closes the diagnostic isolation gap exposed by the Desktop black-screen
investigation. The app already had normal Desktop visibility and visual
watchdog gates, but temporary-profile probes could still collide with the live
default-profile app if Electron took the single-instance lock before applying
the probe-specific `HARBORLINE_USER_DATA_DIR`. That made the next probe exit
early and left the operator staring at a stale or black live window.

Desktop probe isolation evidence:

- Command: `npm run fluid:desktop-probe-isolation`.
- Gate: `G-FG-49`.
- Evidence snapshot:
  `docs/evidence/FG-49-desktop-probe-isolation-2026-06-09.json`.
- Bootstrap proof: `electron/main.cjs` applies `HARBORLINE_USER_DATA_DIR` before
  `app.requestSingleInstanceLock`, and `electron/main.test.mjs` pins that order.
- Runtime proof: the report keeps one packaged default-profile Ocean Impact Lab
  instance alive, launches `scripts/fluid_render_probe.mjs` against the same
  packaged executable with temporary userData, and requires nonblank varied
  WebGPU pixels from the second instance while the first remains reachable.

FG-50 turns FG-48's near-watch residuals into an explicit calibration frontier.
The worst residual is concrete drop speed, but the reference band's upper edge
is vacuum free-fall and the current dense-cube result is physically plausible.
That means the right next action is not to add fake air drag just to hit a
midpoint. The second frontier item, foam settled buoyancy error, is a
lower-is-better hydrostatic/damping error and is the next physics tuning
candidate as long as all accepted bands stay preserved.

High-resolution calibration frontier evidence:

- Command: `npm run fluid:high-resolution-calibration-frontier`.
- Gate: `G-FG-50`.
- Evidence snapshot:
  `docs/evidence/FG-50-high-resolution-calibration-frontier-2026-06-09.json`.
- No-regression proof: the report consumes passing `G-FG-48` evidence,
  preserving all 10 accepted comparisons, target objective counts, tolerance
  margins, and `G-FG-47` live `1024 x 576` visual provenance.
- Action proof: `live-foam-settled-buoyancy-error` is classified as a
  `physics-tuning-candidate`, while `live-drop-speed-reference` is classified
  as a `reference-target-review` before any blind free-fall drag tuning.

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
23. Ultra-tier live reference replay: drive the packaged ultra renderer through
    the concrete, ice, foam, sink, and leaky-drum reference scenarios, then
    verify drop, splash, float, sink, and damping outcomes remain inside their
    accepted bands while pressure, particles, object-grid coupling, fixed-step
    telemetry, and no-full-grid-readback discipline stay intact.
24. Adaptive local tier calibration: compose local resolution-scaling, ultra
    renderer pacing, and ultra reference-outcome evidence into a conservative
    tier recommendation, then prove the packaged app's `auto` path selects the
    calibrated live tier while explicit user overrides remain intact.
25. Persisted local calibration profile: save the adaptive tier decision in
    app-owned desktop storage, read it during Electron startup, and prove a
    normal packaged launch can select the calibrated tier without a calibrated
    tier environment variable.
26. Installed calibration reuse: install the FG-23-derived calibration profile
    through the desktop storage helper, then prove two clean packaged launches
    from the same app-owned profile reuse the calibrated tier without fluid-tier
    environment variables.
27. Installed calibration display pacing: measure the normal env-free
    installed-profile startup path across idle, concrete-impact, and
    foam-damping scenarios, requiring calibrated-auto ultra sample provenance
    plus smooth frame pacing, long-task, pressure, particle, coupling, and
    fixed-step telemetry.
28. Calibration freshness invalidation: persist app-version and source-evidence
    provenance with the local profile, then prove Electron reuses only current
    profiles and rejects stale profiles before selecting calibrated-auto.
29. Impact energy budgeting: require the live ultra concrete impact to account
    for bounded pressure impulse, splash grid energy, foam/potential energy,
    particle reentry, and mass-ratio channels against source-traced reference
    evidence before treating splash realism as physically defensible.
30. Surface recovery damping: sample the packaged ultra canvas and telemetry
    after impact, requiring visible agitation, foam, and pressure work to
    recover over the post-impact window while the WebGPU grid remains active
    and no-full-grid-readback discipline holds.
31. Desktop launcher reproducibility: package into a stable local install root
    outside the repo workspace, verify the Desktop launcher resolves to the
    signed app bundle, then launch that exact target with the default profile
    and prove nonblank/varied WebGPU pixels.
32. Default-profile calibrated launch: install the local GPU calibration profile
    into the real Ocean Impact Lab Application Support storage, then prove the
    Desktop launcher selects calibrated-auto ultra without fluid-tier
    environment overrides.
33. Visible Desktop launch: open the Desktop app through the normal macOS
    launch path, prove the installed calibrated process owns a visible
    frontmost window, and sample the ocean viewport pixels so a black screen
    cannot pass through hidden renderer automation.
34. Installed calibrated reference outcomes: run the live reference comparison
    suite through the actual Desktop launcher and real default calibrated
    profile, proving calibrated-auto ultra preserves drop, splash, float, sink,
    and damping behavior without explicit tier environment overrides.
35. Experimental high-resolution headroom: launch the packaged app with the
    production runtime still capped at ultra, then benchmark explicit
    high-resolution grids beyond `768 x 432` for WebGPU grid, bounded-pressure,
    and localized-particle workloads using timestamp-query timing, bounded
    memory, and no full-grid readback.
36. Experimental live high-resolution renderer: keep calibrated capability
    selection capped at ultra, then allow one benchmark-approved grid to drive
    the actual packaged WebGPU canvas through an explicit
    `OCEAN_LAB_EXPERIMENTAL_FLUID_GRID` launch flag and require smooth live
    pacing plus no full-grid readback.
37. Experimental high-resolution reference outcomes: replay the physical
    reference packet through the explicit live `1024 x 576` renderer and require
    drop, splash, float, sink, and damping comparisons to stay inside accepted
    bands with active pressure, particle, coupling, frame-loop, and no-readback
    evidence.
38. Persisted high-resolution runtime-grid calibration: store the approved
    `1024 x 576` runtime grid in the local calibration profile only when FG-40
    passes, then prove packaged startup can recover that grid from storage
    without manual fluid/grid environment overrides.
39. Installed high-resolution reference pacing: replay the reference outcome
    packet through the real Desktop launcher and default high-resolution profile,
    requiring smooth `1024 x 576` WebGPU pacing without fluid-tier, grid, or
    userData environment overrides.
40. Installed high-resolution float/sink envelope: exercise every object preset
    through the installed default high-resolution profile, proving stable
    floaters, immediate sinkers, waterlogging predictions, visible nonblack
    canvas pixels, and smooth WebGPU pacing.
41. Installed high-resolution Desktop visibility: open the installed Desktop app
    through the normal macOS launch path, foreground the real app window, and
    crop the visible ocean viewport so high-resolution black-screen regressions
    cannot pass hidden renderer automation.
42. Installed high-resolution operator readouts: drive the visible preset and
    Drop controls in the installed Desktop app, then verify the visible float,
    sink, waterlogging, impact, splash, renderer, and timing readouts against
    live `1024 x 576` WebGPU physics snapshots.
43. Installed high-resolution residual budget: consume the installed
    high-resolution reference and operator evidence, compute normalized
    residuals plus nearest-bound margins for every drop, splash, float, sink,
    and damping comparison, and fail before accepted behavior drifts too close
    to a tolerance edge.
44. Installed high-resolution visual watchdog: sample multiple idle and
    post-drop Desktop canvas frames at live `1024 x 576`, require advancing
    WebGPU water-frame telemetry plus nonblank varied pixels, and reject black,
    flat, stale, fallback, or UI-only visual proof.
45. Target-aware high-resolution residual budget: consume FG-46 residuals and
    FG-47 visual watchdog proof, classify each reference comparison as
    midpoint-target, lower-is-better, or exact, and separate physical target
    error from tolerance-edge margin before accepting installed behavior.
46. Desktop probe isolation: keep a normal default-profile Desktop app alive
    while a second temporary-profile packaged probe renders, proving
    single-instance lock behavior cannot hide black-screen or stale-window
    failures from future calibration gates.
47. High-resolution calibration frontier: rank FG-48 target residuals without
    loosening accepted bands, split physics tuning candidates from source/target
    review items, and make foam buoyancy the next tuning target while concrete
    free-fall target semantics are reviewed.

## Resolution Ladder

The solver should scale by measured budget rather than hard-coded optimism.

| Tier | Grid | Primary Use | Minimum Gate |
| --- | --- | --- | --- |
| Low | 128 x 72 | compatibility fallback | 30 FPS, nonblank, stable diagnostics |
| Standard | 256 x 144 | default interactive mode | 45 FPS average on target desktop |
| High | 512 x 288 | realism inspection | 30 FPS average with stable CFL |
| Ultra | 768 x 432 or higher | calibrated local realism mode | opt-in or calibrated-auto only |

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
