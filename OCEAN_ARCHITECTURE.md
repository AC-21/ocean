# Ocean Architecture Decision

Date: 2026-06-06

## Decision

Use a Pixi-first ocean renderer: a custom Pixi mesh or full-screen shader layer
fed by the shared `OceanField` contract in `src/game/ocean.ts`.

Do not migrate the whole map to Three.js yet. Do not run a permanent Pixi plus
Three hybrid yet. Keep Three.js as a fallback for a later spike if the game
needs perspective-camera reflection/refraction that Pixi cannot deliver at the
desired quality.

Status: resolved for the vertical slice. The water, ship response, and
desktop/compact performance gates now have current evidence, so Three.js stays
deferred unless a future visual target fails the reconsideration gates below.
The M-037 technology spike also defers external water/physics packages for
production right now: no package class materially beats extending the existing
Pixi/OceanField path with persistent wakes and richer hull response.

## Why This Fits Harborline

- Harborline is a 2D/2.5D trading game with isometric minimalist ships and
  ports over realistic water. The important production problem is believable
  moving water, not a fully 3D world.
- The current Pixi map already owns the canvas, hit testing, route lines,
  ports, generated sprites, ship wake, and ship motion.
- The current ocean model is shared by gameplay and rendering:
  `sampleOceanPoint`, `sampleRouteOcean`, and `sampleShipMotion` already drive
  route physics, sea watches, route labels, water marks, ship bob/roll, and
  wake angle.
- Pixi supports shader effects and mesh geometry inside the same renderer we
  already use. That lets us replace the line-art water without duplicating the
  map stack.
- Three.js has official water helpers, but they require a Three WebGL renderer
  and are optimized around a 3D reflective plane. Bringing that in now would
  add a second renderer, input mapping, z/layer ordering, asset alignment, and
  performance complexity before we have proven Pixi cannot hit the target.

## Current Prototype Evidence

- `src/game/ocean.ts` exposes deterministic wave layers, wind, current fields,
  storm fronts, route samples, and ship motion.
- `src/MapScene.tsx` samples that field for production water signals, storm
  fronts, route coloring, route curvature, ship bob/roll/yaw, drift, and
  heading-correct wake direction.
- `src/game/ocean.ts` now exposes shared route-display, route-motion, and
  ship-response summaries from the same `OceanField` used by route math.
- `src/MapScene.tsx` now separates the high/balanced Pixi shader ocean from a
  true low-power graphics fallback. The fallback disables the shader mesh and
  draws coarse depth bands, port-shelf glints, current ribbons, wind streaks,
  and storm overlays at half resolution.
- `src/MapScene.tsx` exposes `data-water-surface="production-ocean-surface-v2"`,
  `data-render-layers="shader-plus-sampled-surface-v2"`, sampled-water tile,
  foam, current-ribbon, storm-coverage, and normal-variance telemetry, plus
  `data-ship-motion="ocean-response-v3"`, so browser smoke and the in-app
  browser can assert water and ship-aware response behavior from the live
  rendered map.
- Unit coverage now includes a renderer-ready `defaultOceanField` contract:
  frame data, point samples, route samples, route curvature, ship-response
  signals, rough-water response, and ship motion stay bounded.
- Follow-up route-physics coverage now includes route sea-state signals from
  the shared ocean field: peak wave height, beam sea, following/against-sea
  set, and cargo-slam pressure. Those signals feed route speed, route threat,
  hull wear, cargo risk, crew strain, freight pressure, route tactic labels,
  Route Command/Route Board `Swell` reads, and Physics Debug output.
- `npm run ocean:physics-spike` writes
  `reports/ocean-physics-spike-latest.json`, sampling all 30 directed routes
  across 60 days and attaching latest GPU benchmark evidence. The latest report
  measured 1,800 route/day samples, beam sea `0.388..1`, cargo slam
  `0.359..1`, following sea `-0.43..0.43`, peak wave `3.08..25.77`, five
  route sea-state labels, five tactic labels, ship-response lift `0.874`,
  cargo-slam loaded cargo risk `0.52`, GPU cost `passed`, and decision
  `continue-pixi-first`.
- `npm run ocean:technology-spike` writes
  `reports/ocean-technology-spike-latest.json`, comparing the current
  Pixi/OceanField path, a targeted no-dependency OceanField extension, a 2D
  rigid-body package class, a 3D reflective water renderer class, and a heavier
  fluid-simulation class. Latest report, generated
  2026-06-07T02:22:24.811Z: all core gates passed, winner
  `narrow-oceanfield-extension` score `7.84`, current Pixi/OceanField score
  `7.839`, best external package class `fluid-solver-package` score `4.143`,
  material external-package improvement `false`, margin `3.697`, and decision
  `extend-oceanfield-no-package`.
- `npm run sailing:physics` writes `reports/sailing-physics-latest.json`,
  proving M-038's integrated sailing path: route ETA, risk, hull wear, storm
  pressure, player-facing route explanations, ship motion, and wake behavior
  are all driven by the shared OceanField while ship class and cargo load change
  the motion. Latest report, generated 2026-06-07T02:35:20.857Z: route
  `grayhaven->stormhook`, day `22`, `5` ship cases, wake length `0.963..1.451`,
  wake spread `1.139..1.518`, hull response `0.788..0.833`, Clipper wake
  advantage `0.488`, heavy-hull wake spread advantage `0.345`, and decision
  `integrated-oceanfield-sailing-v1`.
- `npm run ocean:visual-calibration` writes
  `reports/ocean-visual-calibration-latest.json`, comparing the Pixi-first
  water to the approved realistic teal-gray ocean references from
  `src/game/artDirection.ts` and attaching live benchmark evidence. Latest
  report, generated 2026-06-07T14:42:53.694Z: palette hue `191.4`, average
  saturation `0.664`, luma `34.8..226.5`, depth contrast `0.515`, average foam
  `0.307`, max storm `0.555`, route visual-risk spread `0.439`, live map
  surface `passed`, min average FPS `28.3`, and decision
  `calibrated-pixi-water`.
- `npm run ocean:compatibility` writes
  `reports/ocean-compatibility-latest.json`, joining benchmark and visual
  calibration evidence into the M-039/M-039B water gate. Latest report,
  generated 2026-06-07T14:43:07.753Z: desktop FPS headroom `+3/+25.6`,
  low-power FPS headroom `+4.3/+4.8`, all four cases `nonblank/varied`,
  RuntimeClean, `0` console errors, `0` page errors, fallback scale reduction
  `0.22/0.22`, color reduction `9/7`, fallback status `intentional`,
  readability risk spread `0.439`, depth contrast `0.515`, and decision
  `ocean-compatible-v2`.
- Browser smoke on the current map verifies the canvas renders, production
  ocean signals exist, ship response is ocean-driven before and after route
  plotting, and runtime/console health stay clean during route-selection and
  sailing flows.
- `src/MapScene.tsx` exposes foreground render telemetry on the map host:
  current FPS, average FPS, min/max FPS, recent average, sample count,
  stability, active water renderer, active quality, and adaptive fallback
  status.
- `npm run ocean:benchmark` launches the production Vite preview in Chromium at
  desktop and compact viewports, checks runtime/canvas health, collects
  foreground FPS samples, compares low-power cost against shader cases, and
  writes `reports/ocean-benchmark-latest.json`.
- Latest local benchmark, generated 2026-06-07T14:42:07.357Z:
  - Default desktop, 1440x920: `balanced` quality with `shader-mesh-v2`, 8
    samples, average 33 FPS, recent average 33 FPS, min 16, max 36, strained
    but passing, nonblank/varied canvas, 22 color buckets, RuntimeClean, 0
    console errors, 0 page errors, no adaptive fallback.
  - Compact desktop, 900x700: `balanced` quality with `shader-mesh-v2`, 8
    samples, average 55.6 FPS, recent average 55.6 FPS, min 32, max 60, stable,
    nonblank/varied canvas, 31 color buckets, RuntimeClean, 0 console errors,
    0 page errors, no adaptive fallback.
  - Low-power desktop, 1440x920: `low` quality with
    `low-power-graphics-v2`, 8 samples, average 28.3 FPS, recent average
    28.3 FPS, min 20, max 30, stable, nonblank/varied canvas, 13 color buckets,
    RuntimeClean, 0 console errors, 0 page errors, no adaptive fallback.
  - Compact low-power, 900x700: `low` quality with `low-power-graphics-v2`, 8
    samples, average 28.8 FPS, recent average 28.8 FPS, min 21, max 30, stable,
    nonblank/varied canvas, 24 color buckets, RuntimeClean, 0 console errors,
    0 page errors, no adaptive fallback.
- `npm run verify` now includes automated browser regression smoke for the
  gameplay path and map canvas probe. It passed after the v2 ocean compatibility
  gate with 33 test files, 292 tests, desktop storage smoke, asset
  verification, production build, artifact smoke, and browser smoke at
  `http://127.0.0.1:62878`.
- In-app browser proof at
  `http://127.0.0.1:57966/?verify=water-v2-iab` verified nonblank/varied
  canvas, `production-ocean-surface-v2`, `shader-mesh-v2`,
  `shader-plus-sampled-surface-v2`, 49 sampled water tiles, current ribbons
  `0.135`, foam coverage `0.717`, normal variance `0.987`, storm coverage
  `0.281`, Runtime Clean, and `ocean-response-v3` remains available for ship
  motion.

## M-015 Closeout

Decision: do not run a Three.js spike for the vertical slice. Keep the map and
water Pixi-first.

Why:

- The current Pixi path meets the vertical-slice bar: realistic moving
  teal-gray ocean, route-readable currents/storm/foam/depth/risk, and visible
  ship bob/roll/yaw/wake response from the shared ocean field.
- The route map is a dense strategy surface. It needs readable ports, route
  lines, hit testing, labels, generated sprites, overlays, keyboard/focus
  controls, and compact UI more than it needs a perspective-reflective water
  plane.
- `npm run verify` is green on the full gameplay/browser path after the
  production ocean and ship-response changes.
- `npm run ocean:benchmark` proves the Pixi renderer across desktop and compact
  viewports with low-power fallback evidence.
- Adding Three.js now would create a second renderer loop, asset alignment
  problem, pointer mapping problem, z-ordering problem, screenshot/canvas-probe
  problem, and GPU budget problem before it solves a verified release blocker.

Three.js remains deferred, not forbidden. Reopen it only if a future visual QA
pass or external playtest identifies a specific ocean quality blocker that Pixi
cannot solve inside one renderer.

Required proof for any future Three.js spike:

1. Reflection/refraction quality: a Three layer must visibly beat the current
   Pixi ocean on the approved Harborline art direction, not merely look more
   3D in isolation.
2. Input/layer sync: ports, ship sprites, routes, labels, hit testing, keyboard
   selection, and overlays must remain pixel-aligned across resize, compact
   layout, low-power mode, and screenshots.
3. Route readability: route risk, current, storm, foam, depth, ship wake, and
   selected-route heat must remain more readable than the current Pixi map.
4. GPU cost: desktop and compact benchmarks must meet or beat the current
   Pixi evidence, including low-power behavior and no fresh console/runtime
   errors.
5. Migration cost: the spike must show a path that does not delay economy,
   contracts, crew, ships, politics, saves, packaging, or playtest work needed
   for the vertical slice.

## Renderer Options

### Option A - Pixi Shader/Mesh Water

Recommendation: chosen.

Shape:
- Add an `OceanSurface` Pixi layer that replaces `drawWater`.
- Render a full-map quad or subdivided mesh.
- Feed shader uniforms from `defaultOceanField.frame(day, time, width, height)`.
- Use wave-layer uniforms, wind direction, storm-front centers, and route
  current samples to drive color depth, normals, foam, streaks, and swell.
- Keep CPU ocean sampling as the authoritative gameplay field. The shader
  should visually approximate that same field with matching parameters.

Cost:
- Low migration cost.
- No new runtime dependency.
- 2-3 day visual spike, then 1-2 weeks for production polish, performance
  gates, and low-power fallback.

Risks:
- Pixi v7 shader ergonomics are lower-level than a dedicated 3D water helper.
- Reflective water will be stylized rather than physically mirrored unless we
  write more custom render-pass logic.

Exit criteria:
- Current line-art water is reduced to the low-power/fallback layer while the
  default map uses the shader mesh.
- Water communicates swell, current, roughness, storm intensity, foam, and route
  risk without extra labels.
- Ship bob/roll/wake use the same `OceanField`.
- Canvas pixel checks prove nonblank water on desktop and compact layouts.
- Foreground benchmark proves default desktop smoothness above the current
  30 FPS minimum and records any adaptive fallback.

### Option B - Pixi UI + Three.js Ocean Layer

Recommendation: defer. Do not start a Three.js layer unless Pixi fails a future
visual target that cannot be solved with shader/mesh work inside the current
renderer.

Shape:
- Keep Pixi for ports, ships, UI-map overlays, routes, hit testing.
- Mount a synchronized Three canvas below or above Pixi for water.
- Feed Three water uniforms from the same `OceanField` data.

Cost:
- Medium/high migration cost.
- Adds Three.js and a second renderer loop.
- 4-6 day integration spike, 2-4 weeks to productionize.

Risks:
- Two renderers complicate pointer mapping, z-ordering, resize behavior,
  screenshots, canvas verification, asset scale, and GPU budget.
- Three's official water is a 3D reflective plane; our map still needs
  readable top-down/isometric trading information.

When to reconsider:
- If Pixi cannot deliver believable normals/foam/color motion at 60 FPS.
- If we intentionally shift the map toward a 3D camera instead of a 2D/2.5D
  trading board.

### Option C - Full Renderer Migration

Recommendation: reject for now.

Cost:
- High migration cost.
- Likely 2-5 weeks before the current feature set returns to parity.

Risks:
- Rebuilds routes, ports, click handling, sprites, labels, and map overlays
  before the gameplay loop is content-complete.
- Delays economy, ships, crew, contracts, politics, and generated asset work.

When to reconsider:
- Only if the entire game direction becomes a 3D sailing simulation rather than
  a Tradewinds-like trading strategy run.

## Production Path

1. Keep `OceanField` as the single source for gameplay and rendering.
2. Create `OceanSurface` in Pixi with shader-backed color, swell, foam, and
   current streaks.
3. Move current `drawWater` line-art to a removable fallback.
4. Add route-current bending and wake foam from the same ocean field.
5. Add canvas pixel and browser smoke checks for nonblank water, ship motion,
   route readability, and no fresh console errors.
6. Run a low-power mode pass: fewer samples, simpler foam, no high-frequency
   streaks. Current status: the first fallback exists and has benchmark evidence
   at 28.6 average FPS with nonblank/varied canvas output.
7. Add persistent wake ribbons and ship-class response curves inside the
   existing `OceanField`/Pixi path before installing a water or physics package.
8. Only run a Three.js or external water-package spike if the current path fails
   the technology gate or a future visual target cannot be reached inside one
   renderer.

## Benchmark Gate

Run:

```sh
npm run build
npm run ocean:benchmark
npm run ocean:visual-calibration
npm run ocean:compatibility
```

Passing criteria:
- Default desktop and compact desktop benchmarks use `shader-mesh-v2`.
- Default desktop and compact desktop average FPS are at least 30 in foreground
  sampling.
- Low-power desktop and compact low-power benchmarks use
  `low-power-graphics-v2`.
- Low-power average FPS is at least 24 in foreground sampling.
- Every case reports nonblank/varied canvas output, Runtime Clean, no page
  errors, and no fresh console errors.
- Low-power cases prove lower render scale and no higher pixel-color complexity
  than the matching shader case.

The benchmark writes the latest measured evidence to
`reports/ocean-benchmark-latest.json`.

The visual calibration writes the latest style/readability evidence to
`reports/ocean-visual-calibration-latest.json`.

The compatibility gate writes the latest release-readiness evidence to
`reports/ocean-compatibility-latest.json`.

## Physics Spike Gate

Run:

```sh
npm run build
npm run ocean:benchmark
npm run ocean:physics-spike
```

Passing criteria:
- Route sea-state sampling covers all directed routes across the 60-day run
  horizon with varied beam sea, cargo slam, following/against-sea, and peak
  wave measurements.
- Ship response shows measurable motion lift from the shared ocean field.
- Route readability exposes multiple player-facing sea-state and tactic labels.
- Loaded cargo increases pressure, cargo risk, or wear on cargo-slam water.
- Current fields include both following and contrary route sets.
- Freight pressure produces import and export price effects.
- The latest ocean benchmark is attached and passes GPU-cost checks.

The spike writes the latest decision evidence to
`reports/ocean-physics-spike-latest.json`.

## Technology Spike Gate

Run:

```sh
npm run build
npm run ocean:benchmark
npm run ocean:visual-calibration
npm run ocean:physics-spike
npm run ocean:technology-spike
```

Passing criteria:
- The latest benchmark evidence is attached and passes GPU-cost checks.
- Visual calibration is `calibrated-pixi-water`.
- Physics spike evidence is `continue-pixi-first`.
- The comparison includes the current Pixi/OceanField path, a targeted
  no-dependency OceanField extension, a 2D rigid-body package class, a 3D water
  renderer class, and a heavier fluid-simulation class.
- An external package only earns adoption if it beats the best no-dependency
  path by at least the material-improvement margin while preserving route
  readability and GPU budget.

The spike writes the latest package/renderer decision evidence to
`reports/ocean-technology-spike-latest.json`.

## Sailing Physics Gate

Run:

```sh
npm run build
npm run sailing:physics
```

Passing criteria:
- Route days, risk, hull wear, storm pressure, sea-state labels, tactic labels,
  and route explanations come from the same OceanField route samples.
- Ship motion accepts `shipId` and `cargoLoad` so different hull roles produce
  distinct bob, roll, yaw, drift, wake length, wake spread, wake turbulence,
  wake persistence, and hull response.
- Loaded freighters spread and damp their wake differently from empty carriers.
- Rough-water hulls damp response more than the starter hull.
- The map exposes `ocean-response-v3` telemetry and browser smoke checks the
  ship-aware wake/hull-response values.

The gate writes the latest integrated-sailing evidence to
`reports/sailing-physics-latest.json`.

## External References

- [PixiJS filters](https://pixijs.download/dev/docs/filters.html) support
  custom shader-style post-processing and displacement.
- [PixiJS Mesh](https://pixijs.download/v7.2.3/docs/PIXI.Mesh.html) supports
  custom geometry and shaders in Pixi v7.
- [Three.js Water](https://threejs.org/docs/pages/Water.html) is an official
  addon for a flat reflective water effect using `WebGLRenderer`.
